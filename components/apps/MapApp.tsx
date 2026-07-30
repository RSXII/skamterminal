"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fetchEntities, updateDistrictBoundary } from "@/lib/entities";
import type { Entity, MapPoint } from "@/lib/types";
import { Rich } from "@/components/entity/Rich";
import { DossierPanel } from "@/components/entity/DossierPanel";

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

interface Focus {
  point: { x: number; y: number }; // absolute map units
  baseScale: number;
}

const CITY_FOCUS: Focus = { point: CENTER, baseScale: 1 };

export function MapApp() {
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
  const draggingVertex = useRef<number | null>(null);
  const panRef = useRef<{ startClientX: number; startClientY: number; startFocusX: number; startFocusY: number; moved: boolean } | null>(
    null
  );
  const suppressNextClickRef = useRef(false);

  const svgRef = useRef<SVGSVGElement>(null);

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
    // Captured startFocusX/Y as locals above, not read from panRef.current inside this updater —
    // React can invoke a setState updater after a later pointerup already cleared the ref, which
    // was throwing "can't access property startFocusX, panRef.current is null" in production.
    const nextPoint = { x: startFocusX - worldDx, y: startFocusY - worldDy };
    setFocus((f) => ({ ...f, point: nextPoint }));
  }

  function handleMapPointerUp() {
    draggingVertex.current = null;
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
        {!selectedLocation && (
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
                  <g style={{ transform, transition: isDraggingMap ? "none" : "transform 0.6s cubic-bezier(0.2,0.7,0.3,1)" }}>
                    <image href={cityEntity.mapImageUrl} x={VB.x} y={VB.y} width={VB.w} height={VB.h} />

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
                        return (
                          <polygon
                            key={d.id}
                            points={pts}
                            fill={isEditing ? "rgba(95,208,232,0.10)" : lit ? "rgba(232,163,61,0.10)" : "rgba(0,0,0,0)"}
                            stroke={isEditing ? "#5fd0e8" : lit ? "#ffd58a" : "transparent"}
                            strokeWidth={3}
                            vectorEffect="non-scaling-stroke"
                            style={{
                              cursor: districtId ? "default" : "pointer",
                              pointerEvents: districtId ? "none" : "auto",
                              transition: isEditing ? undefined : "fill 0.15s, stroke 0.15s",
                              filter: isEditing
                                ? "drop-shadow(0 0 5px #5fd0e8)"
                                : lit
                                  ? "drop-shadow(0 0 4px #e8a33d) drop-shadow(0 0 10px #e8a33d)"
                                  : "none",
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
                            style={{ cursor: "pointer", filter: "drop-shadow(0 0 6px rgba(232,163,61,0.8))" }}
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
