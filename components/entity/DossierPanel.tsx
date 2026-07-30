"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Entity } from "@/lib/types";
import { plainText } from "@/lib/text";
import { Rich } from "@/components/entity/Rich";
import { Portrait } from "@/components/entity/Portrait";
import { NotesEditor } from "@/components/entity/NotesEditor";

/** Full dossier view for a single entity: header, portrait/gallery, stats, sections, quote, field notes. */
export function DossierPanel({
  entity,
  after,
  showNotes = true,
}: {
  entity: Entity;
  /** Extra content rendered after sections/quote, before field notes — e.g. a district's location list. */
  after?: ReactNode;
  showNotes?: boolean;
}) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  useEffect(() => setGalleryIndex(0), [entity.id]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5">
      <div className="flex items-baseline justify-between text-[9px] tracking-[0.25em] text-gold-faint uppercase">
        <span>{entity.fileNo}</span>
        <span style={{ color: entity.colors?.accent }}>{entity.stamp}</span>
      </div>

      <div className="mt-3 flex gap-5">
        <div className="hud-corners shrink-0">
          <Portrait entity={entity} imageUrl={entity.images[galleryIndex]} className="h-36 w-36" />
        </div>
        <div className="min-w-0 flex-1">
          <Rich html={entity.name} className="text-xl font-bold tracking-[0.1em] text-gold glow" />
          <Rich html={entity.epithet} className="mt-1 block text-xs leading-relaxed text-gold-dim italic" />
          <dl className="mt-4 space-y-1.5 font-[family-name:var(--font-tech)] text-xs">
            {entity.stats.map((s) => (
              <div key={s.label} className="flex gap-3">
                <dt className="w-28 shrink-0 tracking-[0.15em] text-gold-faint uppercase">{s.label}</dt>
                <Rich html={s.value} className="text-gold-dim" />
              </div>
            ))}
          </dl>
        </div>
      </div>

      {entity.images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {entity.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${plainText(entity.name)} ${i + 1}`}
              onClick={() => setGalleryIndex(i)}
              className={`h-14 w-14 shrink-0 cursor-pointer border object-cover transition-opacity ${
                galleryIndex === i ? "border-gold opacity-100" : "border-line-2 opacity-60 hover:opacity-90"
              }`}
            />
          ))}
        </div>
      )}

      <div className="mt-4 space-y-4 border-t border-line pt-3">
        {entity.sections.map((section) => (
          <div key={section.heading}>
            <div className="mb-1 text-[10px] tracking-[0.25em] text-gold-dim uppercase">{section.heading}</div>
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

        {entity.quote && (
          <div className="border-l-2 border-line-2 pl-3">
            <Rich html={entity.quote.text} className="block text-xs leading-relaxed text-gold italic" />
            <Rich html={entity.quote.cite} className="mt-1 block text-[10px] tracking-[0.1em] text-gold-faint uppercase" />
          </div>
        )}
      </div>

      {after}

      {showNotes && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line pt-3">
          <NotesEditor entityId={entity.id} />
        </div>
      )}
    </div>
  );
}
