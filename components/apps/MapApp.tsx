"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fetchEntities, updateDistrictBoundary } from "@/lib/entities";
import type { Entity, MapPoint } from "@/lib/types";
import { Rich } from "@/components/entity/Rich";
import { DossierPanel } from "@/components/entity/DossierPanel";
import { useSession } from "@/lib/session";

const CITY_ENTITY_ID = "city-overview";
// The whole city is one shared vector canvas — every hotspot/boundary point
// is a percentage of this fixed viewBox, never of a separate cropped image.
const VB = { x: 2730, y: 2730, w: 10922, h: 10922 };
const CENTER = { x: VB.x + VB.w / 2, y: VB.y + VB.h / 2 };
const LOCATION_ZOOM_BOOST = 2.3;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;
const PAN_THRESHOLD = 5; // px of pointer movement before a press-drag counts as panning, not a click
const PIN_BASE_R = 46; // user units at scale 1 — divided by current scale to stay a constant screen size

// Detail tiles: the base overview image is soft once the player is zoomed in close, so past this
// scale we additionally load in the 2x-density quadrant tile(s) covering whatever's on screen.
const TILE_ZOOM_THRESHOLD = 3;
const TILE_HALF = VB.w / 2;
const QUADRANTS = [
  { key: "nw", x: VB.x, y: VB.y, w: TILE_HALF, h: TILE_HALF },
  { key: "ne", x: VB.x + TILE_HALF, y: VB.y, w: TILE_HALF, h: TILE_HALF },
  { key: "sw", x: VB.x, y: VB.y + TILE_HALF, w: TILE_HALF, h: TILE_HALF },
  { key: "se", x: VB.x + TILE_HALF, y: VB.y + TILE_HALF, w: TILE_HALF, h: TILE_HALF },
] as const;

function abs(pct: MapPoint) {
  return { x: VB.x + (pct.x / 100) * VB.w, y: VB.y + (pct.y / 100) * VB.h };
}

function polygonBBox(points: MapPoint[]) {
  const pts = points.map(abs);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Uniform scale that fits a bbox (with a little padding) inside the full viewBox. */
function fitScaleFor(bbox: { minX: number; maxX: number; minY: number; maxY: number }) {
  const w = (bbox.maxX - bbox.minX) * 1.35;
  const h = (bbox.maxY - bbox.minY) * 1.35;
  return Math.min(VB.w / Math.max(w, 1), VB.h / Math.max(h, 1));
}

/** Which detail-tile quadrants (if any) currently overlap the visible viewport. */
function activeTilesFor(
  totalScale: number,
  focusPoint: { x: number; y: number },
  viewportRect: { width: number; height: number } | null
): (typeof QUADRANTS)[number]["key"][] {
  if (totalScale < TILE_ZOOM_THRESHOLD || !viewportRect || !viewportRect.width || !viewportRect.height) return [];
  const frameScale = Math.min(viewportRect.width / VB.w, viewportRect.height / VB.h);
  const halfWorldW = viewportRect.width / (frameScale * totalScale) / 2;
  const halfWorldH = viewportRect.height / (frameScale * totalScale) / 2;
  const minX = focusPoint.x - halfWorldW;
  const maxX = focusPoint.x + halfWorldW;
  const minY = focusPoint.y - halfWorldH;
  const maxY = focusPoint.y + halfWorldH;
  return QUADRANTS.filter((q) => minX < q.x + q.w && maxX > q.x && minY < q.y + q.h && maxY > q.y).map((q) => q.key);
}

interface Focus {
  point: { x: number; y: number }; // absolute map units
  baseScale: number;
}

const CITY_FOCUS: Focus = { point: CENTER, baseScale: 1 };

export function MapApp() {
  const { role } = useSession();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus>(CITY_FOCUS);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [target, setTarget] = useState("");
  const [placed, setPlaced] = useState<Record<string, MapPoint>>({});
  const [editingBoundaryId, setEditingBoundaryId] = useState<string | null>(null);
  const [boundaryDraft, setBoundaryDraft] = useState<MapPoint[] | null>(null);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);
  const draggingVertex = useRef<number | null>(null);
  const panRef = useRef<{
    startClientX: number;
    startClientY: number;
    startFocusX: number;
    startFocusY: number;
    moved: boolean;
    liveX: number;
    liveY: number;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    fetchEntities()
      .then((list) => {
        setEntities(list);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load entities:", err);
        setStatus("error");
      });
  }, []);

  // Tracks the map's on-screen size so we know which detail tile(s) the current pan/zoom
  // is actually looking at — read from state rather than the ref during render (refs aren't
  // meant to be read there) and kept live across container/window resizes for free.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => setViewportSize({ width: svg.clientWidth, height: svg.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
    // The <svg> only exists once status flips to "ready" (see the JSX below), so this must
    // re-run then — an empty dep array would observe nothing, since svgRef.current is still
    // null on the very first effect pass.
  }, [status]);

  const cityEntity = entities.find((e) => e.id === CITY_ENTITY_ID);
  const districts = useMemo(() => entities.filter((e) => e.kind === "district"), [entities]);
  const locations = useMemo(() => entities.filter((e) => e.kind === "location"), [entities]);
  const selectedDistrict = districts.find((d) => d.id === districtId) ?? null;
  const districtLocations = locations.filter((l) => l.district === districtId);
  const selectedLocation = locations.find((l) => l.id === locationId) ?? null;
  const sheetOpen = !!selectedLocation;

  const goCity = useCallback(() => {
    setDistrictId(null);
    setLocationId(null);
    setHoveredDistrictId(null);
    setEditMode(false);
    setTarget("");
    setFocus(CITY_FOCUS);
    setZoomMultiplier(1);
  }, []);

  const focusDistrict = useCallback(
    (id: string) => {
      const d = districts.find((x) => x.id === id);
      if (!d) return;
      setDistrictId(id);
      setLocationId(null);
      setHoveredLocationId(null);
      setEditMode(false);
      setTarget("");
      setZoomMultiplier(1);
      if (d.boundary && d.boundary.length >= 3) {
        const bbox = polygonBBox(d.boundary);
        setFocus({ point: { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 }, baseScale: fitScaleFor(bbox) });
      } else if (d.cityHotspot) {
        const p = abs(d.cityHotspot);
        setFocus({ point: p, baseScale: 3 });
      } else {
        setFocus(CITY_FOCUS);
      }
    },
    [districts]
  );

  const selectLocation = useCallback(
    (id: string) => {
      if (locationId === id) {
        // toggle off — re-focus the parent district
        setLocationId(null);
        if (districtId) focusDistrict(districtId);
        return;
      }
      const l = districtLocations.find((x) => x.id === id);
      setLocationId(id);
      setZoomMultiplier(1);
      if (l?.districtHotspot) {
        setFocus((f) => ({ point: abs(l.districtHotspot!), baseScale: f.baseScale * LOCATION_ZOOM_BOOST }));
      }
    },
    [locationId, districtId, districtLocations, focusDistrict]
  );

  const totalScale = focus.baseScale * zoomMultiplier;
  const matrixE = CENTER.x - totalScale * focus.point.x;
  const matrixF = CENTER.y - totalScale * focus.point.y;
  const transform = `matrix(${totalScale},0,0,${totalScale},${matrixE},${matrixF})`;
  // Not tracked during a live pan drag, since that's handled by direct DOM writes and only
  // commits to state (focus, and so this) on release.
  const activeTileKeys = activeTilesFor(totalScale, focus.point, viewportSize);

  function zoomBy(factor: number) {
    setZoomMultiplier((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  /** Screen click -> {x%, y%} in the shared map space, inverting the current pan/zoom. */
  function screenToPct(clientX: number, clientY: number): MapPoint | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const frameScale = Math.min(rect.width / VB.w, rect.height / VB.h);
    const renderedW = VB.w * frameScale;
    const renderedH = VB.h * frameScale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;
    const outerX = VB.x + (clientX - rect.left - offsetX) / frameScale;
    const outerY = VB.y + (clientY - rect.top - offsetY) / frameScale;
    const worldX = (outerX - matrixE) / totalScale;
    const worldY = (outerY - matrixF) / totalScale;
    return { x: Math.round(((worldX - VB.x) / VB.w) * 1000) / 10, y: Math.round(((worldY - VB.y) / VB.h) * 1000) / 10 };
  }

  const startEditingBoundary = useCallback((d: Entity) => {
    setEditingBoundaryId(d.id);
    setBoundaryDraft(d.boundary ? d.boundary.map((p) => ({ ...p })) : []);
    setTarget("");
    if (d.boundary && d.boundary.length >= 3) {
      const bbox = polygonBBox(d.boundary);
      setFocus({ point: { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 }, baseScale: fitScaleFor(bbox) });
      setZoomMultiplier(1);
    }
  }, []);

  function cancelBoundaryEdit() {
    setEditingBoundaryId(null);
    setBoundaryDraft(null);
    draggingVertex.current = null;
  }

  async function saveBoundaryEdit() {
    if (!editingBoundaryId || !boundaryDraft || boundaryDraft.length < 3) return;
    setSavingBoundary(true);
    try {
      await updateDistrictBoundary(editingBoundaryId, boundaryDraft);
      setEntities((prev) => prev.map((e) => (e.id === editingBoundaryId ? { ...e, boundary: boundaryDraft } : e)));
      setEditingBoundaryId(null);
      setBoundaryDraft(null);
    } catch (err) {
      console.error("Failed to save boundary:", err);
      alert("Save failed — check that Firestore write access is currently open.");
    } finally {
      setSavingBoundary(false);
    }
  }

  function deleteVertex(index: number) {
    setBoundaryDraft((prev) => (prev && prev.length > 3 ? prev.filter((_, i) => i !== index) : prev));
  }

  function insertVertexAt(index: number, point: MapPoint) {
    setBoundaryDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next.splice(index, 0, point);
      return next;
    });
    draggingVertex.current = index;
  }

  /** Starts a potential pan drag on background press — becomes a real pan only past PAN_THRESHOLD, so a plain click still reaches district/pin handlers. */
  function handleMapPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0 || draggingVertex.current !== null) return;
    suppressNextClickRef.current = false;
    panRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startFocusX: focus.point.x,
      startFocusY: focus.point.y,
      moved: false,
      liveX: focus.point.x,
      liveY: focus.point.y,
    };
  }

  function handleMapPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (draggingVertex.current !== null) {
      const pct = screenToPct(e.clientX, e.clientY);
      if (!pct) return;
      const idx = draggingVertex.current;
      setBoundaryDraft((prev) => (prev ? prev.map((p, i) => (i === idx ? pct : p)) : prev));
      return;
    }
    if (!panRef.current) return;
    const { startClientX, startClientY, startFocusX, startFocusY } = panRef.current;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    if (!panRef.current.moved) {
      if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
      panRef.current.moved = true;
      suppressNextClickRef.current = true;
      setIsDraggingMap(true);
      // Only capture once we know this is a real drag — capturing eagerly on every press would
      // retarget the eventual "click" compat event to the svg instead of whatever's under the
      // cursor, silently breaking district/pin onClick handlers for plain, non-dragging clicks.
      safeCapture(e.currentTarget, e.pointerId);
    }
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const frameScale = Math.min(rect.width / VB.w, rect.height / VB.h);
    const worldDx = dx / (frameScale * totalScale);
    const worldDy = dy / (frameScale * totalScale);
    const nextPoint = { x: startFocusX - worldDx, y: startFocusY - worldDy };
    panRef.current.liveX = nextPoint.x;
    panRef.current.liveY = nextPoint.y;
    // Write the drag position straight to the DOM instead of through React state — with ~6000
    // vector elements in the map, a setState (and the re-render it triggers) on every pointermove
    // was visibly janky. State only gets one commit, at pointerup, via handleMapPointerUp below.
    const g = gRef.current;
    if (g) {
      const e2 = CENTER.x - totalScale * nextPoint.x;
      const f2 = CENTER.y - totalScale * nextPoint.y;
      g.style.transform = `matrix(${totalScale},0,0,${totalScale},${e2},${f2})`;
    }
  }

  function handleMapPointerUp() {
    draggingVertex.current = null;
    if (panRef.current?.moved) {
      const { liveX, liveY } = panRef.current;
      setFocus((f) => ({ ...f, point: { x: liveX, y: liveY } }));
    }
    panRef.current = null;
    setIsDraggingMap(false);
  }

  /** setPointerCapture throws if the browser has no active pointer with this id (e.g. synthetic events) — drag still works via the SVG-level move/up handlers either way. */
  function safeCapture(el: SVGElement, pointerId: number) {
    try {
      el.setPointerCapture(pointerId);
    } catch {
      // ignore — non-essential, just improves drag continuity when the cursor leaves the handle
    }
  }

  const unplaced = districtId
    ? districtLocations.filter((l) => !l.districtHotspot && !placed[l.id])
    : districts.filter((d) => !d.cityHotspot && !d.boundary && !placed[d.id]);

  return (
    <div className="flex h-full flex-col bg-ink-2">
      {/* breadcrumb */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-panel/60 px-4 py-2">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase">
          <button onClick={goCity} className={districtId ? "text-gold-dim hover:text-gold" : "text-gold"}>
            Fate City
          </button>
          {selectedDistrict && (
            <>
              <span className="text-gold-faint">/</span>
              <button
                onClick={() => focusDistrict(selectedDistrict.id)}
                className={selectedLocation ? "text-gold-dim hover:text-gold" : "text-gold"}
              >
                <Rich html={selectedDistrict.name} />
              </button>
            </>
          )}
          {selectedLocation && (
            <>
              <span className="text-gold-faint">/</span>
              <span className="text-gold">
                <Rich html={selectedLocation.name} />
              </span>
            </>
          )}
        </div>
        {!selectedLocation && role === "admin" && (
          <button
            onClick={() => {
              setEditMode((v) => !v);
              setTarget("");
              cancelBoundaryEdit();
            }}
            className={`fc-btn px-3 py-1 text-[10px] ${editMode ? "border-gold bg-gold/15" : ""}`}
          >
            {editMode ? "Done Editing" : "Edit Map"}
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* sidebar */}
        <div className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-line bg-panel/60">
          {status === "loading" && (
            <div className="p-3 text-[10px] tracking-[0.15em] text-gold-faint">LOADING MAP DATA…</div>
          )}
          {status === "error" && (
            <div className="p-3 text-[10px] leading-relaxed tracking-[0.1em] text-danger/80">
              CONNECTION FAILED — could not reach the shared database.
            </div>
          )}
          {!districtId
            ? districts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => focusDistrict(d.id)}
                  onMouseEnter={() => setHoveredDistrictId(d.id)}
                  onMouseLeave={() => setHoveredDistrictId((cur) => (cur === d.id ? null : cur))}
                  className={`border-b border-line/50 px-3 py-2.5 text-left text-xs transition-colors ${
                    hoveredDistrictId === d.id ? "bg-panel-2 text-gold" : "text-gold-dim hover:bg-panel hover:text-gold"
                  }`}
                >
                  <Rich html={d.name} className="block truncate font-semibold" />
                  <span className="text-[9px] tracking-[0.1em] text-gold-faint uppercase">{d.fileNo}</span>
                </button>
              ))
            : districtLocations.length > 0
              ? districtLocations.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => selectLocation(l.id)}
                    onMouseEnter={() => setHoveredLocationId(l.id)}
                    onMouseLeave={() => setHoveredLocationId((cur) => (cur === l.id ? null : cur))}
                    className={`border-b border-line/50 px-3 py-2.5 text-left text-xs transition-colors ${
                      locationId === l.id ? "bg-panel-2 text-gold" : "text-gold-dim hover:bg-panel hover:text-gold"
                    }`}
                  >
                    <Rich html={l.name} className="block truncate font-semibold" />
                    <span className="text-[9px] tracking-[0.1em] text-gold-faint uppercase">{l.fileNo}</span>
                  </button>
                ))
              : status === "ready" && (
                  <div className="p-3 text-[10px] leading-relaxed tracking-[0.15em] text-gold-faint">
                    NO KNOWN LOCATIONS ON RECORD
                  </div>
                )}
        </div>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-5">
          {status === "ready" && cityEntity?.mapImageUrl ? (
            <>
              <div className="hud-corners relative min-h-0 flex-1 overflow-hidden bg-[#03070c]">
                <svg
                  ref={svgRef}
                  viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
                  className={`h-full w-full ${editMode ? "cursor-crosshair" : isDraggingMap ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{ touchAction: "none" }}
                  onClick={(e) => {
                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }
                    if (!editMode || !target || editingBoundaryId) return;
                    const pct = screenToPct(e.clientX, e.clientY);
                    if (!pct) return;
                    setPlaced((prev) => ({ ...prev, [target]: pct }));
                    setTarget("");
                  }}
                  onPointerDown={handleMapPointerDown}
                  onPointerMove={handleMapPointerMove}
                  onPointerUp={handleMapPointerUp}
                  onPointerLeave={handleMapPointerUp}
                >
                  <g
                    ref={gRef}
                    style={{ transform, transition: isDraggingMap ? "none" : "transform 0.6s cubic-bezier(0.2,0.7,0.3,1)" }}
                  >
                    <image href={cityEntity.mapImageUrl} x={VB.x} y={VB.y} width={VB.w} height={VB.h} />

                    {/* 2x-detail tiles, layered over the base image, loaded in only for whichever
                        quadrant(s) are on screen once zoomed in close enough to need them. */}
                    {cityEntity.mapTiles &&
                      QUADRANTS.filter((q) => activeTileKeys.includes(q.key)).map((q) => (
                        <image key={q.key} href={cityEntity.mapTiles![q.key]} x={q.x} y={q.y} width={q.w} height={q.h} />
                      ))}

                    {districts.map((d) => {
                        const isEditing = editingBoundaryId === d.id;
                        const isSelected = districtId === d.id;
                        // At city level every district's outline can be hovered/clicked; once drilled
                        // into one, only its own outline stays on screen as a static bounds indicator.
                        if (districtId && !isSelected && !isEditing) return null;
                        const boundary = isEditing ? boundaryDraft : d.boundary;
                        if (!boundary || boundary.length < 3) return null;
                        const hovered = !districtId && hoveredDistrictId === d.id;
                        const lit = hovered || isSelected;
                        const pts = boundary.map((p) => {
                          const a = abs(p);
                          return `${a.x},${a.y}`;
                        }).join(" ");
                        const glowColor = isEditing ? "#5fd0e8" : "#ffd58a";
                        return (
                          <g key={d.id}>
                            {/* Cheap glow: a wide, low-opacity duplicate stroke instead of a
                                drop-shadow filter — with ~6000 map elements underneath, a blurred
                                filter recomputed every paint (e.g. while panning) was visibly janky. */}
                            {(isEditing || lit) && (
                              <polygon
                                points={pts}
                                fill="none"
                                stroke={glowColor}
                                strokeOpacity={0.35}
                                strokeWidth={14}
                                vectorEffect="non-scaling-stroke"
                                style={{ pointerEvents: "none" }}
                              />
                            )}
                            <polygon
                              points={pts}
                              fill={isEditing ? "rgba(95,208,232,0.10)" : lit ? "rgba(232,163,61,0.10)" : "rgba(0,0,0,0)"}
                              stroke={isEditing ? "#5fd0e8" : lit ? "#ffd58a" : "transparent"}
                              strokeWidth={3}
                              vectorEffect="non-scaling-stroke"
                              style={{
                                cursor: districtId ? "default" : "pointer",
                                pointerEvents: districtId ? "none" : "auto",
                                transition: isEditing ? undefined : "fill 0.15s, stroke 0.15s",
                              }}
                              onMouseEnter={() => setHoveredDistrictId(d.id)}
                              onMouseLeave={() => setHoveredDistrictId((cur) => (cur === d.id ? null : cur))}
                              onClick={(e) => {
                                if (suppressNextClickRef.current) {
                                  suppressNextClickRef.current = false;
                                  return;
                                }
                                if (editMode) {
                                  e.stopPropagation();
                                  startEditingBoundary(d);
                                } else {
                                  focusDistrict(d.id);
                                }
                              }}
                            />
                          </g>
                        );
                      })}

                    {editingBoundaryId &&
                      boundaryDraft &&
                      boundaryDraft.map((p, i) => {
                        const a = abs(p);
                        const next = abs(boundaryDraft[(i + 1) % boundaryDraft.length]);
                        const mid = { x: (a.x + next.x) / 2, y: (a.y + next.y) / 2 };
                        const r = (PIN_BASE_R * 0.7) / totalScale;
                        const midR = (PIN_BASE_R * 0.45) / totalScale;
                        // Visible markers stay small so they don't clutter the shape, but a mouse
                        // needs a much bigger target to actually grab one — hit circles carry the
                        // pointer handlers and scale with the same 1/totalScale factor so they stay
                        // a constant, comfortably-clickable screen size at any zoom.
                        const hitR = (PIN_BASE_R * 1.8) / totalScale;
                        const midHitR = (PIN_BASE_R * 1.3) / totalScale;
                        return (
                          <g key={i}>
                            <circle
                              cx={mid.x}
                              cy={mid.y}
                              r={midHitR}
                              fill="transparent"
                              style={{ cursor: "copy" }}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                safeCapture(e.target as SVGElement, e.pointerId);
                                insertVertexAt(i + 1, screenToPct(e.clientX, e.clientY) ?? p);
                              }}
                            />
                            <circle
                              cx={mid.x}
                              cy={mid.y}
                              r={midR}
                              fill="#5fd0e84d"
                              stroke="#5fd0e8"
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                              style={{ pointerEvents: "none" }}
                            />
                            <circle
                              cx={a.x}
                              cy={a.y}
                              r={hitR}
                              fill="transparent"
                              style={{ cursor: "grab" }}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                safeCapture(e.target as SVGElement, e.pointerId);
                                draggingVertex.current = i;
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                deleteVertex(i);
                              }}
                            />
                            <rect
                              x={a.x - r}
                              y={a.y - r}
                              width={r * 2}
                              height={r * 2}
                              fill="#ffd58a"
                              stroke="#03070c"
                              strokeWidth={1.5}
                              vectorEffect="non-scaling-stroke"
                              style={{ pointerEvents: "none" }}
                            />
                          </g>
                        );
                      })}

                    {districtId &&
                      districtLocations.map((l) => {
                        if (!l.districtHotspot) return null;
                        const p = abs(l.districtHotspot);
                        const active = l.id === locationId;
                        const r = PIN_BASE_R / totalScale;
                        return (
                          <circle
                            key={l.id}
                            cx={p.x}
                            cy={p.y}
                            r={r}
                            fill={active ? "#ffd58a" : "rgba(232,163,61,0.35)"}
                            stroke={active ? "#ffd58a" : "#e8a33d"}
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                            style={{
                              cursor: "pointer",
                              // Glow only the active pin — a permanent blur filter on every pin in a
                              // district (some have a dozen+) was a needless per-pin paint cost.
                              filter: active ? "drop-shadow(0 0 6px rgba(232,163,61,0.8))" : "none",
                            }}
                            onClick={() => {
                              if (suppressNextClickRef.current) {
                                suppressNextClickRef.current = false;
                                return;
                              }
                              selectLocation(l.id);
                            }}
                          />
                        );
                      })}

                    {Object.entries(placed).map(([id, pt]) => {
                      const p = abs(pt);
                      const r = PIN_BASE_R / totalScale;
                      return (
                        <circle key={id} cx={p.x} cy={p.y} r={r} fill="#5fd0e84d" stroke="#5fd0e8" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                      );
                    })}

                    {hoveredLocationId &&
                      districtLocations.find((l) => l.id === hoveredLocationId)?.districtHotspot &&
                      (() => {
                        const p = abs(districtLocations.find((l) => l.id === hoveredLocationId)!.districtHotspot!);
                        const r = (PIN_BASE_R * 1.8) / totalScale;
                        return (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={r}
                            fill="none"
                            stroke="#ffd58a"
                            strokeWidth={2}
                            vectorEffect="non-scaling-stroke"
                            className="pointer-events-none animate-pulse"
                          />
                        );
                      })()}
                  </g>
                </svg>

                {/* zoom controls */}
                <div className="absolute right-3 bottom-3 flex flex-col border border-line bg-panel/90">
                  <button
                    onClick={() => zoomBy(1.4)}
                    aria-label="Zoom in"
                    className="flex h-7 w-7 items-center justify-center border-b border-line text-gold-dim hover:bg-panel-2 hover:text-gold"
                  >
                    <svg viewBox="0 0 10 10" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 1 v8 M1 5 h8" />
                    </svg>
                  </button>
                  <button
                    onClick={() => zoomBy(1 / 1.4)}
                    aria-label="Zoom out"
                    className="flex h-7 w-7 items-center justify-center text-gold-dim hover:bg-panel-2 hover:text-gold"
                  >
                    <svg viewBox="0 0 10 10" className="h-3 w-3" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 5 h8" />
                    </svg>
                  </button>
                </div>

                {/* dim + cinematic sheet (screen-space UI, outside the map transform) */}
                <div
                  onClick={() => selectLocation(locationId!)}
                  className={`absolute inset-0 bg-[#030503] transition-opacity duration-400 ${
                    sheetOpen ? "pointer-events-auto opacity-55" : "pointer-events-none opacity-0"
                  }`}
                />
                <div
                  className={`absolute right-0 bottom-0 left-0 overflow-hidden border-t border-gold-faint bg-panel/98 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] transition-[height] duration-500 ease-out ${
                    sheetOpen ? "h-[60%]" : "h-0"
                  }`}
                >
                  {selectedLocation && (
                    <div className="relative h-full overflow-y-auto">
                      <button
                        onClick={() => selectLocation(selectedLocation.id)}
                        className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center border border-line text-gold-dim hover:border-gold hover:text-gold"
                        aria-label="Close"
                      >
                        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 2 l6 6 M8 2 l-6 6" />
                        </svg>
                      </button>
                      <DossierPanel entity={selectedLocation} />
                    </div>
                  )}
                </div>
              </div>

              {editMode && editingBoundaryId && (
                <div className="mt-3 flex shrink-0 items-center gap-3 border-t border-line pt-3 text-xs">
                  <span className="text-[10px] tracking-[0.2em] text-gold-dim uppercase">
                    Editing boundary — {boundaryDraft?.length ?? 0} points
                  </span>
                  <span className="text-[10px] text-gold-faint">
                    drag a point · drag the small dot on an edge to add one · double-click a point to remove it
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={cancelBoundaryEdit} className="fc-btn px-3 py-1 text-[10px]">
                      Cancel
                    </button>
                    <button
                      onClick={saveBoundaryEdit}
                      disabled={savingBoundary || (boundaryDraft?.length ?? 0) < 3}
                      className="fc-btn border-gold bg-gold/15 px-3 py-1 text-[10px] disabled:opacity-50"
                    >
                      {savingBoundary ? "Saving…" : "Save Boundary"}
                    </button>
                  </div>
                </div>
              )}

              {editMode && !editingBoundaryId && (
                <div className="mt-3 shrink-0 border-t border-line pt-3 text-xs">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.2em] text-gold-dim uppercase">Placing:</span>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="fc-input py-1 text-xs"
                    >
                      <option value="">— pick an unplaced entity —</option>
                      {unplaced.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.id}
                        </option>
                      ))}
                    </select>
                    {unplaced.length === 0 && <span className="text-gold-faint">everything here is already placed</span>}
                    <span className="ml-auto text-gold-faint">or click an existing district outline to edit its shape</span>
                  </div>
                  {Object.keys(placed).length > 0 && (
                    <>
                      <div className="mb-1 text-[10px] tracking-[0.2em] text-gold-dim uppercase">
                        Unsaved this session — copy into a hotspot script
                      </div>
                      <textarea
                        readOnly
                        value={JSON.stringify(placed, null, 1)}
                        className="fc-input h-24 w-full resize-none font-[family-name:var(--font-tech)] text-[10px]"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            status === "ready" && cityEntity && <DossierPanel entity={cityEntity} showNotes={false} />
          )}
        </div>
      </div>
    </div>
  );
}
