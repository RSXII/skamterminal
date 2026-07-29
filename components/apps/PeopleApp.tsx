"use client";

import { useEffect, useState } from "react";
import { fetchEntities } from "@/lib/entities";
import { loadNotes, saveNotes } from "@/lib/data";
import type { Entity, EntityKind } from "@/lib/types";
import { PortraitPlaceholder } from "@/components/os/icons";

const KIND_LABELS: Record<EntityKind, string> = {
  briefing: "Briefing",
  person: "Persons",
  organization: "Organizations",
};
const KIND_ORDER: EntityKind[] = ["briefing", "person", "organization"];

/** Strips the HTML entities/tags the source dossiers are authored with, for plain-text contexts (initials, alt text). */
function plainText(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&rsquo;|&lsquo;/g, "’")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&");
}

function initials(name: string) {
  return plainText(name)
    .replace(/["“”]/g, "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Renders GM-authored dossier copy, which relies on entities/inline tags (curly quotes, <strong>, etc). */
function Rich({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function NotesEditor({ entityId }: { entityId: string }) {
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setText(loadNotes(entityId));
    setSavedAt(null);
  }, [entityId]);

  useEffect(() => {
    const t = setTimeout(() => {
      saveNotes(entityId, text);
      if (text) setSavedAt(Date.now());
    }, 500);
    return () => clearTimeout(t);
  }, [entityId, text]);

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

function Portrait({
  entity,
  className,
  imageUrl,
}: {
  entity: Entity;
  className: string;
  imageUrl?: string;
}) {
  const [src, setSrc] = useState(imageUrl ?? entity.images[0]);
  useEffect(() => setSrc(imageUrl ?? entity.images[0]), [entity.id, imageUrl, entity.images]);

  if (!src) {
    return (
      <PortraitPlaceholder seed={entity.fileNo.length} initials={initials(entity.name)} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={plainText(entity.name)}
      className={`${className} object-cover`}
      onError={() => setSrc(undefined as unknown as string)}
    />
  );
}

export function PeopleApp() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  const selected = entities.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    setGalleryIndex(0);
  }, [selectedId]);

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABELS[kind],
    entries: entities.filter((e) => e.kind === kind),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="flex h-full bg-ink-2">
      {/* roster */}
      <div className="flex w-52 shrink-0 flex-col border-r border-line bg-panel/60">
        <div className="border-b border-line px-3 py-2 text-[10px] tracking-[0.3em] text-gold-dim">
          PROFILES · {entities.length}
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
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
          <div className="flex items-baseline justify-between text-[9px] tracking-[0.25em] text-gold-faint uppercase">
            <span>{selected.fileNo}</span>
            <span style={{ color: selected.colors?.accent }}>{selected.stamp}</span>
          </div>

          <div className="mt-3 flex gap-5">
            <div className="hud-corners shrink-0">
              <Portrait entity={selected} imageUrl={selected.images[galleryIndex]} className="h-36 w-36" />
            </div>
            <div className="min-w-0 flex-1">
              <Rich html={selected.name} className="text-xl font-bold tracking-[0.1em] text-gold glow" />
              <Rich
                html={selected.epithet}
                className="mt-1 block text-xs leading-relaxed text-gold-dim italic"
              />
              <dl className="mt-4 space-y-1.5 font-[family-name:var(--font-tech)] text-xs">
                {selected.stats.map((s) => (
                  <div key={s.label} className="flex gap-3">
                    <dt className="w-28 shrink-0 tracking-[0.15em] text-gold-faint uppercase">{s.label}</dt>
                    <Rich html={s.value} className="text-gold-dim" />
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {selected.images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {selected.images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`${plainText(selected.name)} ${i + 1}`}
                  onClick={() => setGalleryIndex(i)}
                  className={`h-14 w-14 shrink-0 cursor-pointer border object-cover transition-opacity ${
                    galleryIndex === i ? "border-gold opacity-100" : "border-line-2 opacity-60 hover:opacity-90"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="mt-4 space-y-4 border-t border-line pt-3">
            {selected.sections.map((section) => (
              <div key={section.heading}>
                <div className="mb-1 text-[10px] tracking-[0.25em] text-gold-dim uppercase">
                  {section.heading}
                </div>
                {section.paragraphs?.map((p, i) => (
                  <Rich key={i} html={p} className="mb-2 block text-xs leading-relaxed text-gold-dim" />
                ))}
                {section.hooks && (
                  <ul className="space-y-1.5">
                    {section.hooks.map((h, i) => (
                      <li key={i} className="flex gap-2 text-xs leading-relaxed text-gold-dim">
                        <span className="text-gold-faint">›</span>
                        <Rich html={h} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {selected.quote && (
              <div className="border-l-2 border-line-2 pl-3">
                <Rich html={selected.quote.text} className="block text-xs leading-relaxed text-gold italic" />
                <Rich
                  html={selected.quote.cite}
                  className="mt-1 block text-[10px] tracking-[0.1em] text-gold-faint uppercase"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line pt-3">
            <NotesEditor entityId={selected.id} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gold-faint">
          {status === "loading" ? "Loading Records…" : status === "error" ? "No Connection" : "No Record Available"}
        </div>
      )}
    </div>
  );
}
