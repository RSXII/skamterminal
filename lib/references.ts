// Inline "#entity-id" references inside player-authored evidence-board note text — see
// components/apps/tracker/EvidenceBoard.tsx. Reuses the same `entities/{id}` slugs already
// used across the app (lib/entities.ts) so a reference always points at a real record.

import type { Entity } from "@/lib/types";
import { plainText } from "@/lib/text";

// Ids in Firestore are lowercase slugs, plain or hyphenated (`casven`, `skam-tower`) — never
// underscored — but \w already covers the plain case and the extra hyphen is cheap to allow.
export const REFERENCE_PATTERN = /#([\w-]+)/g;

export function findEntityByRef(entities: Entity[], ref: string): Entity | undefined {
  const target = ref.toLowerCase();
  return entities.find((e) => e.id.toLowerCase() === target);
}

export type TextSegment = { kind: "text"; value: string } | { kind: "ref"; entity: Entity };

/** Splits note text into plain-text runs and resolved entity references, in reading order. An
 * unmatched "#word" (no entity with that id) is left as plain text rather than a broken chip. */
export function parseReferences(text: string, entities: Entity[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    const [raw, slug] = match;
    const entity = findEntityByRef(entities, slug);
    if (!entity) continue;
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ kind: "text", value: text.slice(lastIndex, index) });
    segments.push({ kind: "ref", entity });
    lastIndex = index + raw.length;
  }
  if (lastIndex < text.length) segments.push({ kind: "text", value: text.slice(lastIndex) });
  return segments;
}

/** Entities a player could plausibly reference — excludes the meta "briefing" (city overview) doc. */
export function searchEntities(entities: Entity[], query: string, limit = 6): Entity[] {
  const q = query.trim().toLowerCase();
  const candidates = entities.filter((e) => e.kind !== "briefing");
  const scored = candidates
    .map((e) => {
      const id = e.id.toLowerCase();
      const name = plainText(e.name).toLowerCase();
      let rank = -1;
      if (!q) rank = 2;
      else if (id.startsWith(q) || name.startsWith(q)) rank = 3;
      else if (id.includes(q) || name.includes(q)) rank = 2;
      return { entity: e, rank };
    })
    .filter((r) => r.rank >= 0)
    .sort((a, b) => b.rank - a.rank || plainText(a.entity.name).localeCompare(plainText(b.entity.name)));
  return scored.slice(0, limit).map((r) => r.entity);
}

/** Where a "#id" reference chip should navigate, per the same app split MapApp/PeopleApp already use:
 * districts/locations live on the Field Map, everyone/everything else has a Profiles dossier. */
export function referenceTargetApp(entity: Entity): "map" | "profiles" {
  return entity.kind === "district" || entity.kind === "location" ? "map" : "profiles";
}

/** Scans backward from the caret for an in-progress "#query" mention — null if the caret isn't
 * currently inside one (e.g. a space, or no "#", was hit first). */
export function detectMention(value: string, caret: number): { start: number; query: string } | null {
  let i = caret;
  while (i > 0) {
    const ch = value[i - 1];
    if (ch === "#") {
      const before = value[i - 2];
      if (before !== undefined && !/\s/.test(before)) return null; // "#" mid-word (e.g. "C#") — not a mention
      return { start: i - 1, query: value.slice(i, caret) };
    }
    if (/\s/.test(ch)) return null;
    i--;
  }
  return null;
}
