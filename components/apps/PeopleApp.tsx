"use client";

import { useEffect, useState } from "react";
import { fetchEntities } from "@/lib/entities";
import type { Entity, EntityKind } from "@/lib/types";
import { Rich } from "@/components/entity/Rich";
import { Portrait } from "@/components/entity/Portrait";
import { DossierPanel } from "@/components/entity/DossierPanel";
import { useNavigation, useAppFocus, type AppFocus } from "@/lib/navigation";

const KIND_LABELS: Record<EntityKind, string> = {
  briefing: "Briefing",
  person: "Persons",
  organization: "Organizations",
  district: "Districts",
  location: "Locations",
};
const KIND_ORDER: EntityKind[] = ["briefing", "person", "organization"];

export function PeopleApp() {
  const { navigate } = useNavigation();
  const [focus, consumeFocus] = useAppFocus<Extract<AppFocus, { app: "profiles" }>>("profiles");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchEntities()
      .then((list) => {
        if (cancelled) return;
        setEntities(list);
        setSelectedId((id) => id ?? list[0]?.id ?? null);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Failed to load entities:", err);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!focus) return;
    setSelectedId(focus.entityId);
    consumeFocus();
  }, [focus, consumeFocus]);

  const people = entities.filter((e) => KIND_ORDER.includes(e.kind));
  const selected = people.find((e) => e.id === selectedId) ?? null;

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABELS[kind],
    entries: people.filter((e) => e.kind === kind),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="flex h-full bg-ink-2">
      {/* roster */}
      <div className="flex w-52 shrink-0 flex-col border-r border-line bg-panel/60">
        <div className="border-b border-line px-3 py-2 text-[10px] tracking-[0.3em] text-gold-dim">
          PROFILES · {people.length}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "loading" && (
            <div className="p-3 text-[10px] tracking-[0.15em] text-gold-faint">LOADING RECORDS…</div>
          )}
          {status === "error" && (
            <div className="p-3 text-[10px] leading-relaxed tracking-[0.1em] text-danger/80">
              CONNECTION FAILED — could not reach the shared database.
            </div>
          )}
          {groups.map((group) => (
            <div key={group.kind}>
              <div className="border-b border-line/50 bg-panel-2/60 px-3 py-1 text-[9px] tracking-[0.3em] text-gold-faint uppercase">
                {group.label}
              </div>
              {group.entries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-left transition-colors ${
                    selectedId === e.id
                      ? "bg-panel-2 text-gold"
                      : "text-gold-dim hover:bg-panel hover:text-gold"
                  }`}
                >
                  <Portrait entity={e} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0">
                    <Rich html={e.name} className="block truncate text-xs font-semibold" />
                    <div className="truncate text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                      {e.fileNo}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* dossier */}
      {selected ? (
        <DossierPanel
          entity={selected}
          after={
            (selected.kind === "person" || selected.kind === "organization") &&
            selected.district &&
            selected.districtHotspot ? (
              <button
                onClick={() => navigate({ app: "map", locationId: selected.id })}
                className="fc-btn mt-4 text-xs"
              >
                Show on Map
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gold-faint">
          {status === "loading" ? "Loading Records…" : status === "error" ? "No Connection" : "No Record Available"}
        </div>
      )}
    </div>
  );
}
