"use client";

import { useEffect, useState } from "react";
import { fetchNPCs, loadNotes, saveNotes } from "@/lib/data";
import type { NPC } from "@/lib/types";
import { PortraitPlaceholder } from "@/components/os/icons";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function NotesEditor({ npcId }: { npcId: string }) {
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setText(loadNotes(npcId));
    setSavedAt(null);
  }, [npcId]);

  // Debounced autosave to localStorage.
  useEffect(() => {
    const t = setTimeout(() => {
      saveNotes(npcId, text);
      if (text) setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(t);
  }, [npcId, text]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] tracking-[0.25em] text-gold-dim">FIELD NOTES</span>
        {savedAt && (
          <span className="font-[family-name:var(--font-tech)] text-[9px] text-gold-faint">
            SAVED
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Record observations here…"
        spellCheck={false}
        className="fc-input min-h-24 flex-1 resize-none text-xs leading-relaxed"
      />
    </div>
  );
}

export function PeopleApp() {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchNPCs().then((list) => {
      setNpcs(list);
      setSelectedId((id) => id ?? list[0]?.id ?? null);
    });
  }, []);

  const selected = npcs.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex h-full bg-ink-2">
      {/* roster */}
      <div className="flex w-52 shrink-0 flex-col border-r border-line bg-panel/60">
        <div className="border-b border-line px-3 py-2 text-[10px] tracking-[0.3em] text-gold-dim">
          PROFILES · {npcs.length}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-left transition-colors ${
                selectedId === n.id
                  ? "bg-panel-2 text-gold"
                  : "text-gold-dim hover:bg-panel hover:text-gold"
              }`}
            >
              <PortraitPlaceholder seed={n.portraitSeed} initials={initials(n.name)} className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{n.name}</div>
                <div className="truncate text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                  {n.occupation}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* dossier */}
      {selected ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
          <div className="flex gap-5">
            <div className="hud-corners shrink-0">
              <PortraitPlaceholder
                seed={selected.portraitSeed}
                initials={initials(selected.name)}
                className="h-36 w-36"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold tracking-[0.1em] text-gold glow">
                {selected.name}
              </div>
              <div className="mt-0.5 text-[10px] tracking-[0.25em] text-gold-dim uppercase">
                {selected.occupation}
              </div>
              <dl className="mt-4 space-y-1.5 font-[family-name:var(--font-tech)] text-xs">
                {[
                  ["AGE", String(selected.age)],
                  ["GENDER", selected.gender],
                  ["WORKPLACE", selected.workplace],
                  [
                    "RESIDENCE",
                    selected.homeKnown ? selected.home : "⟨ UNKNOWN ⟩",
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <dt className="w-24 shrink-0 tracking-[0.15em] text-gold-faint">{k}</dt>
                    <dd className={v === "⟨ UNKNOWN ⟩" ? "text-danger/80" : "text-gold-dim"}>
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-gold-dim">
            {selected.summary}
          </p>

          <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line pt-3">
            <NotesEditor npcId={selected.id} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gold-faint">
          No Record Available
        </div>
      )}
    </div>
  );
}
