"use client";

import { useEffect, useState } from "react";
import { loadNotes, saveNotes } from "@/lib/data";

export function NotesEditor({ entityId }: { entityId: string }) {
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
