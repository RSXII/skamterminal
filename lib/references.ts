// Inline "#..." references inside player-authored evidence-board note text — see
// components/apps/tracker/BoardCanvas.tsx. Two flavors share the same "#" trigger and chip
// look (per design intent — one reference style, not two):
//   - "#entity-id"   → a real person/org/district/location, using the same `entities/{id}`
//                      slugs already used across the app (lib/entities.ts).
//   - "#note:<id>"   → another evidence note, possibly on a different board. Notes don't have
//                      a human-typable slug the way entities do, so this token is always
//                      inserted by the mention-autocomplete (never hand-typed) and the chip
//                      shows a text preview instead of a name.

import type { Entity, EvidenceNote } from "@/lib/types";
import { plainText } from "@/lib/text";

// Ids in Firestore are lowercase slugs, plain or hyphenated (`casven`, `skam-tower`) — never
// underscored — but \w already covers the plain case and the extra hyphen is cheap to allow.
export const REFERENCE_PATTERN = /#(note:[\w-]+|[\w-]+)/g;

const NOTE_TOKEN_PREFIX = "note:";
const PREVIEW_LEN = 60;

export function notePreview(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > PREVIEW_LEN ? `${trimmed.slice(0, PREVIEW_LEN)}…` : trimmed || "(empty note)";
}

export function findEntityByRef(entities: Entity[], ref: string): Entity | undefined {
  const target = ref.toLowerCase();
  return entities.find((e) => e.id.toLowerCase() === target);
}

export type TextSegment =
  | { kind: "text"; value: string }
  | { kind: "entity-ref"; entity: Entity }
  | { kind: "note-ref"; note: EvidenceNote };

/** Splits note text into plain-text runs and resolved references, in reading order. An
 * unmatched or dangling token (deleted note, unknown id) is left as plain text rather than a
 * broken chip. */
export function parseReferences(text: string, entities: Entity[], notesById: Map<string, EvidenceNote>): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    const [raw, token] = match;
    let segment: TextSegment | undefined;
    if (token.startsWith(NOTE_TOKEN_PREFIX)) {
      const note = notesById.get(token.slice(NOTE_TOKEN_PREFIX.length));
      if (note) segment = { kind: "note-ref", note };
    } else {
      const entity = findEntityByRef(entities, token);
      if (entity) segment = { kind: "entity-ref", entity };
    }
    if (!segment) continue;
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ kind: "text", value: text.slice(lastIndex, index) });
    segments.push(segment);
    lastIndex = index + raw.length;
  }
  if (lastIndex < text.length) segments.push({ kind: "text", value: text.slice(lastIndex) });
  return segments;
}

/** Where a "#id" entity chip should navigate, per the same app split MapApp/PeopleApp already use:
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

export type ReferenceCandidate =
  | { kind: "entity"; entity: Entity }
  | { kind: "note"; note: EvidenceNote; boardName: string };

function rank(query: string, fields: string[]): number {
  if (!query) return 2;
  if (fields.some((f) => f.toLowerCase().startsWith(query))) return 3;
  if (fields.some((f) => f.toLowerCase().includes(query))) return 2;
  return -1;
}

function candidateLabel(c: ReferenceCandidate): string {
  return c.kind === "entity" ? plainText(c.entity.name) : notePreview(c.note.text);
}

/** Autocomplete results for an in-progress "#query" mention — entities (excluding the meta
 * "briefing" city-overview doc) and other evidence notes across every board (excluding the
 * note currently being written, which can't reference itself), ranked together by relevance. */
export function searchReferenceCandidates(
  entities: Entity[],
  notes: EvidenceNote[],
  boardNamesById: Map<string, string>,
  excludeNoteId: string | undefined,
  query: string,
  limit = 6,
): ReferenceCandidate[] {
  const q = query.trim().toLowerCase();
  const entityCandidates: { candidate: ReferenceCandidate; rank: number }[] = entities
    .filter((e) => e.kind !== "briefing")
    .map((e) => ({
      candidate: { kind: "entity" as const, entity: e },
      rank: rank(q, [e.id, plainText(e.name)]),
    }));
  const noteCandidates: { candidate: ReferenceCandidate; rank: number }[] = notes
    .filter((n) => n.id !== excludeNoteId)
    .map((n) => ({
      candidate: { kind: "note" as const, note: n, boardName: boardNamesById.get(n.boardId) ?? "Unknown Board" },
      rank: rank(q, [n.text]),
    }));
  return [...entityCandidates, ...noteCandidates]
    .filter((c) => c.rank >= 0)
    .sort((a, b) => b.rank - a.rank || candidateLabel(a.candidate).localeCompare(candidateLabel(b.candidate)))
    .slice(0, limit)
    .map((c) => c.candidate);
}

/** The "#..." token to insert for a picked candidate — see the module doc for the two formats. */
export function referenceToken(candidate: ReferenceCandidate): string {
  return candidate.kind === "entity" ? `#${candidate.entity.id}` : `#${NOTE_TOKEN_PREFIX}${candidate.note.id}`;
}
