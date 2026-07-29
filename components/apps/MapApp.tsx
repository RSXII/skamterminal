"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEntities } from "@/lib/entities";
import type { Entity, MapPoint } from "@/lib/types";
import { Rich } from "@/components/entity/Rich";
import { DossierPanel } from "@/components/entity/DossierPanel";

const CITY_ENTITY_ID = "city-overview";

/** A gold (saved) or cyan (unsaved, this edit session) pin positioned by percentage. */
function Pin({
  point,
  label,
  shape = "circle",
  unsaved = false,
  onClick,
}: {
  point: MapPoint;
  label: string;
  shape?: "circle" | "square";
  unsaved?: boolean;
  onClick?: () => void;
}) {
  const color = unsaved ? "#5fd0e8" : undefined;
  return (
    <button
      onClick={onClick}
      title={label}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
      className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
    >
      <span
        className={`block h-3 w-3 border-2 ${shape === "circle" ? "rounded-full" : ""} ${
          unsaved ? "" : "border-gold bg-gold/30"
        } shadow-[0_0_10px_rgba(232,163,61,0.8)]`}
        style={unsaved ? { borderColor: color, background: `${color}4d`, boxShadow: `0 0 10px ${color}` } : undefined}
      />
      <span className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap bg-panel px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-gold opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function MapImage({
  src,
  editMode,
  onPlace,
  children,
}: {
  src: string;
  editMode: boolean;
  onPlace?: (point: MapPoint) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="hud-corners relative inline-block max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(e) => {
          if (!editMode || !onPlace) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onPlace({
            x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
            y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
          });
        }}
        className={`block max-h-full max-w-full ${editMode ? "cursor-crosshair" : ""}`}
      />
      {children}
    </div>
  );
}

function EditPanel({
  unplaced,
  target,
  onTargetChange,
  placed,
}: {
  unplaced: Entity[];
  target: string;
  onTargetChange: (id: string) => void;
  placed: Record<string, MapPoint>;
}) {
  const json = JSON.stringify(placed, null, 1);
  return (
    <div className="mt-3 border-t border-line pt-3 text-xs">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] tracking-[0.2em] text-gold-dim uppercase">Placing:</span>
        <select
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
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
      </div>
      {Object.keys(placed).length > 0 && (
        <>
          <div className="mb-1 text-[10px] tracking-[0.2em] text-gold-dim uppercase">
            Unsaved this session — copy into the migration script
          </div>
          <textarea
            readOnly
            value={json}
            className="fc-input h-28 w-full resize-none font-[family-name:var(--font-tech)] text-[10px]"
            onFocus={(e) => e.currentTarget.select()}
          />
        </>
      )}
    </div>
  );
}

export function MapApp() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [target, setTarget] = useState("");
  const [placedCity, setPlacedCity] = useState<Record<string, MapPoint>>({});
  const [placedDistrict, setPlacedDistrict] = useState<Record<string, Record<string, MapPoint>>>({});

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

  function goCity() {
    setDistrictId(null);
    setLocationId(null);
    setEditMode(false);
    setTarget("");
  }
  function goDistrict(id: string) {
    setDistrictId(id);
    setLocationId(null);
    setEditMode(false);
    setTarget("");
  }
  function goLocation(id: string) {
    setLocationId(id);
  }

  const unplacedDistricts = districts.filter((d) => !d.cityHotspot && !placedCity[d.id]);
  const districtPlaced = districtId ? (placedDistrict[districtId] ?? {}) : {};
  const unplacedLocations = districtLocations.filter((l) => !l.districtHotspot && !districtPlaced[l.id]);

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
                onClick={() => goDistrict(selectedDistrict.id)}
                className={locationId ? "text-gold-dim hover:text-gold" : "text-gold"}
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
        {(cityEntity?.mapImageUrl || selectedDistrict?.mapImageUrl) && !selectedLocation && (
          <button
            onClick={() => {
              setEditMode((v) => !v);
              setTarget("");
            }}
            className={`fc-btn px-3 py-1 text-[10px] ${editMode ? "border-gold bg-gold/15" : ""}`}
          >
            {editMode ? "Done Placing" : "Place Pins"}
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
                  onClick={() => goDistrict(d.id)}
                  className="border-b border-line/50 px-3 py-2.5 text-left text-xs text-gold-dim transition-colors hover:bg-panel hover:text-gold"
                >
                  <Rich html={d.name} className="block truncate font-semibold" />
                  <span className="text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                    {d.mapImageUrl ? "mapped" : d.fileNo}
                  </span>
                </button>
              ))
            : districtLocations.length > 0
              ? districtLocations.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => goLocation(l.id)}
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
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {status === "ready" && selectedLocation && <DossierPanel entity={selectedLocation} />}

          {status === "ready" && !selectedLocation && districtId && selectedDistrict && (
            <>
              {selectedDistrict.mapImageUrl ? (
                <>
                  <MapImage
                    src={selectedDistrict.mapImageUrl}
                    editMode={editMode}
                    onPlace={(point) => {
                      if (!target) return;
                      setPlacedDistrict((prev) => ({
                        ...prev,
                        [districtId]: { ...(prev[districtId] ?? {}), [target]: point },
                      }));
                      setTarget("");
                    }}
                  >
                    {districtLocations.map((l) =>
                      l.districtHotspot ? (
                        <Pin key={l.id} point={l.districtHotspot} label={l.id} onClick={() => goLocation(l.id)} />
                      ) : null
                    )}
                    {Object.entries(districtPlaced).map(([id, point]) => (
                      <Pin key={id} point={point} label={id} unsaved />
                    ))}
                  </MapImage>
                  {editMode && (
                    <EditPanel
                      unplaced={unplacedLocations}
                      target={target}
                      onTargetChange={setTarget}
                      placed={districtPlaced}
                    />
                  )}
                </>
              ) : (
                <DossierPanel entity={selectedDistrict} showNotes={false} />
              )}
            </>
          )}

          {status === "ready" && !districtId && (
            <>
              {cityEntity?.mapImageUrl ? (
                <>
                  <MapImage
                    src={cityEntity.mapImageUrl}
                    editMode={editMode}
                    onPlace={(point) => {
                      if (!target) return;
                      setPlacedCity((prev) => ({ ...prev, [target]: point }));
                      setTarget("");
                    }}
                  >
                    {districts.map((d) =>
                      d.cityHotspot ? (
                        <Pin key={d.id} point={d.cityHotspot} label={d.id} shape="square" onClick={() => goDistrict(d.id)} />
                      ) : null
                    )}
                    {Object.entries(placedCity).map(([id, point]) => (
                      <Pin key={id} point={point} label={id} shape="square" unsaved />
                    ))}
                  </MapImage>
                  {editMode && (
                    <EditPanel unplaced={unplacedDistricts} target={target} onTargetChange={setTarget} placed={placedCity} />
                  )}
                </>
              ) : (
                cityEntity && <DossierPanel entity={cityEntity} showNotes={false} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
