"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSession } from "@/lib/session";
import { useNavigation } from "@/lib/navigation";
import { plainText } from "@/lib/text";
import {
  detectMention,
  notePreview,
  parseReferences,
  referenceTargetApp,
  referenceToken,
  searchReferenceCandidates,
  type ReferenceCandidate,
} from "@/lib/references";
import {
  createConnection,
  createNote,
  deleteConnection,
  deleteNote,
  subscribeConnections,
  subscribeNotes,
  updateNotePosition,
  updateNoteText,
} from "@/lib/tracker";
import type { Entity, EvidenceConnection, EvidenceNote } from "@/lib/types";

const BOARD_W = 3000;
const BOARD_H = 2000;
const NOTE_W = 200;
// Cards size to their own text — this is only a fallback for the instant before a card's
// real height has been measured (see cardHeights below), and the drag-bounds/placement math
// that can't wait for a measurement.
const NOTE_MIN_H = 56;
const DRAFT_ID = "__draft__";
const CONNECT_COLOR = "#5fd0e8"; // matches the Field Map's cyan "active tool" accent
const HIGHLIGHT_MS = 2200;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function autosizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function candidateKey(c: ReferenceCandidate): string {
  return c.kind === "entity" ? `e-${c.entity.id}` : `n-${c.note.id}`;
}

interface CardData {
  id: string;
  text: string;
  x: number;
  y: number;
  createdBy?: string;
}

export interface FocusRequest {
  noteId: string;
  nonce: number;
}

interface BoardCanvasProps {
  boardId: string;
  /** Persons/orgs/districts/locations from the shared entities collection — for resolving and
   * autocompleting "#id" references in note text. */
  entities: Entity[];
  /** Every evidence note across every board — for resolving/autocompleting "#note:id" references
   * that may point off this board. This board's own notes still come from a live, board-scoped
   * subscription below so drag/edit stay snappy and optimistic. */
  allNotes: EvidenceNote[];
  boardNamesById: Map<string, string>;
  focusRequest: FocusRequest | null;
  onConsumeFocus: () => void;
  onOpenNoteRef: (note: EvidenceNote) => void;
}

export function BoardCanvas({
  boardId,
  entities,
  allNotes,
  boardNamesById,
  focusRequest,
  onConsumeFocus,
  onOpenNoteRef,
}: BoardCanvasProps) {
  const { user } = useSession();
  const { navigate } = useNavigation();
  const [notes, setNotes] = useState<EvidenceNote[]>([]);
  const [connections, setConnections] = useState<EvidenceConnection[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState<{ x: number; y: number; text: string } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<
    { kind: "note"; id: string; preview: string } | { kind: "connection"; id: string } | null
  >(null);
  const [dragOverride, setDragOverride] = useState<Record<string, { x: number; y: number }>>({});
  // Each card's real rendered height, keyed by id — cards size to their content, so connection
  // lines and drag bounds need to know how tall a card actually is, not a fixed constant.
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  // The in-progress "#query" mention (if any) in whichever card is currently being edited.
  const [mention, setMention] = useState<{ cardId: string; start: number; query: string } | null>(null);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  // Briefly glows a note that a "#note:id" chip elsewhere just jumped the player to.
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const cardElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const textareaElsRef = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      setCardHeights((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.cardId;
          const h = entry.target.getBoundingClientRect().height;
          if (id && next[id] !== h) {
            next[id] = h;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    resizeObserverRef.current = ro;
    return () => ro.disconnect();
  }, []);

  const setCardRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      const map = cardElsRef.current;
      const prevEl = map.get(id);
      if (prevEl && prevEl !== el) resizeObserverRef.current?.unobserve(prevEl);
      if (!el) {
        map.delete(id);
        return;
      }
      el.dataset.cardId = id;
      map.set(id, el);
      resizeObserverRef.current?.observe(el);
      const h = el.getBoundingClientRect().height;
      setCardHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
    },
    [],
  );

  const setTextareaRef = useCallback(
    (id: string) => (el: HTMLTextAreaElement | null) => {
      if (el) {
        textareaElsRef.current.set(id, el);
        autosizeTextarea(el);
      } else {
        textareaElsRef.current.delete(id);
      }
    },
    [],
  );

  const notesById = useMemo(() => new Map(allNotes.map((n) => [n.id, n])), [allNotes]);

  /** Re-derives the active "#query" mention from wherever the caret currently sits — called on
   * every keystroke and on plain caret moves (click, arrow keys), since those don't fire onChange. */
  function syncMention(cardId: string, el: HTMLTextAreaElement) {
    const detected = detectMention(el.value, el.selectionStart ?? el.value.length);
    setMention(detected ? { cardId, ...detected } : null);
    setMentionHighlight(0);
  }

  function insertMention(card: CardData, candidate: ReferenceCandidate) {
    if (!mention || mention.cardId !== card.id) return;
    const isDraft = card.id === DRAFT_ID;
    const current = isDraft ? draft?.text ?? "" : editText;
    const before = current.slice(0, mention.start);
    const after = current.slice(mention.start + 1 + mention.query.length);
    const inserted = `${referenceToken(candidate)} `;
    const next = before + inserted + after;
    if (isDraft) setDraft((d) => (d ? { ...d, text: next } : d));
    else setEditText(next);
    setMention(null);
    const caret = before.length + inserted.length;
    requestAnimationFrame(() => {
      const el = textareaElsRef.current.get(card.id);
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
      autosizeTextarea(el);
    });
  }

  function openEntity(entity: Entity) {
    if (referenceTargetApp(entity) === "map") navigate({ app: "map", locationId: entity.id });
    else navigate({ app: "profiles", entityId: entity.id });
  }

  useEffect(() => {
    setStatus("loading");
    const onError = (err: Error) => {
      console.error("Failed to reach the case board:", err);
      setStatus("error");
    };
    const unsubNotes = subscribeNotes(
      boardId,
      (list) => {
        setNotes(list);
        setStatus("ready");
      },
      onError,
    );
    const unsubConnections = subscribeConnections(boardId, setConnections, onError);
    return () => {
      unsubNotes();
      unsubConnections();
    };
  }, [boardId]);

  /** Jumps to and briefly glows a note a "#note:id" chip (possibly on another board, in which
   * case the parent has already switched us onto it) just linked here from. Waits for `notes`
   * to actually contain the target — right after a board switch this component remounts fresh
   * with an empty list until its own subscription above delivers real data. */
  useEffect(() => {
    if (!focusRequest) return;
    const note = notes.find((n) => n.id === focusRequest.noteId);
    if (!note) return;
    const container = scrollRef.current;
    if (container) {
      const h = cardHeights[note.id] ?? NOTE_MIN_H;
      container.scrollTo({
        left: clamp(note.x - container.clientWidth / 2 + NOTE_W / 2, 0, BOARD_W - container.clientWidth),
        top: clamp(note.y - container.clientHeight / 2 + h / 2, 0, BOARD_H - container.clientHeight),
        behavior: "smooth",
      });
    }
    setHighlightedNoteId(note.id);
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest, notes]);

  // Deliberately its own effect, keyed only on the highlight itself — the scroll-to effect above
  // clears `focusRequest` as soon as it fires, and if this timer lived in that same effect, that
  // very state change would re-run it and cancel the timeout before it ever got to fire.
  useEffect(() => {
    if (!highlightedNoteId) return;
    const t = setTimeout(() => setHighlightedNoteId(null), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlightedNoteId]);

  const cards = useMemo<CardData[]>(() => {
    const base: CardData[] = notes.map((n) => {
      const override = dragOverride[n.id];
      return override ? { ...n, ...override } : n;
    });
    if (draft) {
      const override = dragOverride[DRAFT_ID];
      base.push({ id: DRAFT_ID, text: draft.text, ...(override ?? { x: draft.x, y: draft.y }) });
    }
    return base;
  }, [notes, draft, dragOverride]);

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  function addNote() {
    const container = scrollRef.current;
    if (!container) return;
    const x = clamp(container.scrollLeft + container.clientWidth / 2 - NOTE_W / 2, 0, BOARD_W - NOTE_W);
    const y = clamp(
      container.scrollTop + container.clientHeight / 2 - NOTE_MIN_H / 2,
      0,
      BOARD_H - NOTE_MIN_H,
    );
    setDraft({ x, y, text: "" });
  }

  async function finishDraft() {
    if (!draft) return;
    const text = draft.text.trim();
    if (!text) {
      setDraft(null);
      return;
    }
    setSavingDraft(true);
    try {
      await createNote(boardId, text, draft.x, draft.y, user);
      setDraft(null);
    } catch (err) {
      console.error("Failed to save note:", err);
      alert("Save failed — check that Firestore write access is currently open.");
    } finally {
      setSavingDraft(false);
    }
  }

  function cancelDraft() {
    setDraft(null);
  }

  function startEdit(note: CardData) {
    setEditingId(note.id);
    setEditText(note.text);
  }

  async function finishEdit() {
    if (!editingId) return;
    const id = editingId;
    const text = editText.trim();
    setEditingId(null);
    if (!text || text === notes.find((n) => n.id === id)?.text) return;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    try {
      await updateNoteText(id, text);
    } catch (err) {
      console.error("Failed to save note text:", err);
    }
  }

  function handleDeleteNoteClick(id: string) {
    const note = notes.find((n) => n.id === id);
    const preview = note?.text ? `"${note.text.slice(0, 80)}${note.text.length > 80 ? "…" : ""}"` : "this note";
    setConfirmTarget({ kind: "note", id, preview });
  }

  async function removeNote(id: string) {
    if (id === DRAFT_ID) {
      setDraft(null);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
    if (connectFromId === id) setConnectFromId(null);
    try {
      await deleteNote(id);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  function commitDrag(id: string, x: number, y: number) {
    setDragOverride((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (id === DRAFT_ID) {
      setDraft((d) => (d ? { ...d, x, y } : d));
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    void updateNotePosition(id, x, y).catch((err) => {
      console.error("Failed to save note position:", err);
    });
  }

  const onHeaderPointerDown = useCallback((id: string, e: ReactPointerEvent<HTMLDivElement>) => {
    const card = cardById.get(id);
    if (!card) return;
    dragState.current = { id, startClientX: e.clientX, startClientY: e.clientY, startX: card.x, startY: card.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [cardById]);

  function onHeaderPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    const h = cardHeights[drag.id] ?? NOTE_MIN_H;
    const x = clamp(drag.startX + dx, 0, BOARD_W - NOTE_W);
    const y = clamp(drag.startY + dy, 0, BOARD_H - h);
    setDragOverride((prev) => ({ ...prev, [drag.id]: { x, y } }));
  }

  function onHeaderPointerUp() {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag) return;
    const override = dragOverride[drag.id];
    commitDrag(drag.id, override?.x ?? drag.startX, override?.y ?? drag.startY);
  }

  function handleConnectClick(id: string) {
    if (connectFromId === null) {
      setConnectFromId(id);
      return;
    }
    if (connectFromId === id) {
      setConnectFromId(null);
      return;
    }
    void createConnection(boardId, connectFromId, id, user).catch((err) => {
      console.error("Failed to create connection:", err);
    });
    setConnectFromId(null);
    setConnectMode(false);
  }

  function toggleConnectMode() {
    setConnectMode((v) => !v);
    setConnectFromId(null);
  }

  function toggleDeleteMode() {
    setDeleteMode((v) => !v);
  }

  function handleDeleteConnectionClick(id: string) {
    setConfirmTarget({ kind: "connection", id });
  }

  function confirmDelete() {
    if (!confirmTarget) return;
    if (confirmTarget.kind === "note") void removeNote(confirmTarget.id);
    else void removeConnection(confirmTarget.id);
    setConfirmTarget(null);
  }

  async function removeConnection(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteConnection(id);
    } catch (err) {
      console.error("Failed to delete connection:", err);
    }
  }

  const centerOf = (id: string) => {
    const c = cardById.get(id);
    if (!c) return null;
    const h = cardHeights[id] ?? NOTE_MIN_H;
    return { x: c.x + NOTE_W / 2, y: c.y + h / 2 };
  };

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-panel/60 px-4 py-2">
        <button
          onClick={addNote}
          disabled={!!draft || connectMode || deleteMode}
          className="fc-btn px-3 py-1 text-[10px] disabled:opacity-50"
        >
          + Add Note
        </button>
        <button
          onClick={toggleConnectMode}
          disabled={!!draft || deleteMode}
          className={`fc-btn px-3 py-1 text-[10px] disabled:opacity-50 ${
            connectMode ? "border-gold bg-gold/15" : ""
          }`}
          style={connectMode ? { borderColor: CONNECT_COLOR, color: CONNECT_COLOR } : undefined}
        >
          {connectMode ? "Cancel Connection" : "Add Connection"}
        </button>
        <button
          onClick={toggleDeleteMode}
          disabled={!!draft || connectMode}
          className={`fc-btn px-3 py-1 text-[10px] disabled:opacity-50 ${
            deleteMode ? "border-danger bg-danger/15 text-danger" : ""
          }`}
        >
          {deleteMode ? "Disable Delete" : "Enable Delete"}
        </button>
        {connectMode && (
          <span className="text-[10px] tracking-[0.1em] text-gold-faint">
            {connectFromId ? "Now click a second piece of evidence…" : "Click a piece of evidence to start a line…"}
          </span>
        )}
        {deleteMode && (
          <span className="text-[10px] tracking-[0.1em] text-danger/80">
            Click a note or connection to delete it — you&apos;ll be asked to confirm.
          </span>
        )}
        {status === "error" && (
          <span className="text-[10px] tracking-[0.1em] text-danger/80">
            CONNECTION FAILED — could not reach the shared database.
          </span>
        )}
      </div>

      {/* board */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-[#0a0704]">
        <div
          className="relative"
          style={{
            width: BOARD_W,
            height: BOARD_H,
            backgroundImage:
              "linear-gradient(rgba(232,163,61,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(232,163,61,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        >
          <svg className="pointer-events-none absolute inset-0" width={BOARD_W} height={BOARD_H}>
            {connections.map((c) => {
              const a = centerOf(c.fromId);
              const b = centerOf(c.toId);
              if (!a || !b) return null;
              return (
                <g
                  key={c.id}
                  className={deleteMode ? "group" : undefined}
                  onClick={deleteMode ? () => handleDeleteConnectionClick(c.id) : undefined}
                >
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="transparent"
                    strokeWidth={14}
                    className={deleteMode ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#e85d3d"
                    strokeOpacity={0.85}
                    className={`pointer-events-none ${deleteMode ? "[stroke-width:1.5px] group-hover:[stroke-width:3px]" : "[stroke-width:1.5px]"}`}
                  />
                </g>
              );
            })}
          </svg>

          {status === "loading" && (
            <div className="absolute top-4 left-4 text-[10px] tracking-[0.15em] text-gold-faint">
              LOADING BOARD…
            </div>
          )}

          {cards.map((card) => {
            const isDraft = card.id === DRAFT_ID;
            const isEditing = isDraft || card.id === editingId;
            const isConnectSource = connectFromId === card.id;
            const isHighlighted = highlightedNoteId === card.id;
            const text = isDraft ? draft?.text ?? "" : isEditing ? editText : card.text;
            const mentionMatches =
              mention && mention.cardId === card.id
                ? searchReferenceCandidates(
                    entities,
                    allNotes,
                    boardNamesById,
                    isDraft ? undefined : card.id,
                    mention.query,
                  )
                : [];

            function handleTextareaKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
              if (mentionMatches.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionHighlight((h) => (h + 1) % mentionMatches.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionHighlight((h) => (h - 1 + mentionMatches.length) % mentionMatches.length);
              } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(card, mentionMatches[mentionHighlight] ?? mentionMatches[0]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setMention(null);
              }
            }

            return (
              <div
                key={card.id}
                ref={setCardRef(card.id)}
                className={`hud-corners absolute flex flex-col border border-line-2 bg-panel/95 shadow-[0_4px_16px_rgba(0,0,0,0.45)] transition-shadow ${
                  deleteMode && !isDraft ? "cursor-pointer hover:border-danger" : ""
                }`}
                style={{
                  left: card.x,
                  top: card.y,
                  width: NOTE_W,
                  ...(isConnectSource
                    ? { borderColor: CONNECT_COLOR, boxShadow: `0 0 16px ${CONNECT_COLOR}66` }
                    : isHighlighted
                      ? { borderColor: "#ffd58a", boxShadow: "0 0 20px rgba(255,213,138,0.85)" }
                      : {}),
                }}
                onClick={
                  isDraft
                    ? undefined
                    : connectMode
                      ? () => handleConnectClick(card.id)
                      : deleteMode
                        ? () => handleDeleteNoteClick(card.id)
                        : undefined
                }
              >
                {/* header */}
                <div
                  className="flex h-6 shrink-0 items-center justify-between border-b border-line bg-panel-2/70 px-1.5"
                  style={{ cursor: connectMode || deleteMode ? "pointer" : "grab" }}
                  onPointerDown={connectMode || deleteMode ? undefined : (e) => onHeaderPointerDown(card.id, e)}
                  onPointerMove={connectMode || deleteMode ? undefined : onHeaderPointerMove}
                  onPointerUp={connectMode || deleteMode ? undefined : onHeaderPointerUp}
                  onPointerLeave={connectMode || deleteMode ? undefined : onHeaderPointerUp}
                >
                  {isEditing ? (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDraft) void finishDraft();
                        else void finishEdit();
                      }}
                      disabled={isDraft && savingDraft}
                      className="border border-line-2 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.15em] text-gold uppercase hover:border-gold hover:text-gold-bright disabled:opacity-50"
                    >
                      {isDraft && savingDraft ? "Saving…" : "Done"}
                    </button>
                  ) : (
                    <span className="text-gold-faint">⋮⋮</span>
                  )}
                  {isDraft && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelDraft();
                      }}
                      aria-label="Cancel note"
                      className="flex h-4 w-4 shrink-0 items-center justify-center text-gold-faint hover:text-danger"
                    >
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
                        <path d="M2 2 l6 6 M8 2 l-6 6" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* body */}
                {isEditing ? (
                  <>
                    <textarea
                      autoFocus
                      ref={setTextareaRef(card.id)}
                      value={text}
                      onPointerDown={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        autosizeTextarea(e.target);
                        const v = e.target.value;
                        if (isDraft) setDraft((d) => (d ? { ...d, text: v } : d));
                        else setEditText(v);
                        syncMention(card.id, e.target);
                      }}
                      onClick={(e) => syncMention(card.id, e.currentTarget)}
                      onKeyUp={(e) => {
                        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                          syncMention(card.id, e.currentTarget);
                        }
                      }}
                      onKeyDown={handleTextareaKeyDown}
                      onBlur={() => mention?.cardId === card.id && setMention(null)}
                      placeholder="Type your note… use # to reference evidence"
                      spellCheck={false}
                      rows={1}
                      className="min-h-8 resize-none overflow-hidden bg-transparent px-2 py-1.5 text-[11px] leading-snug text-gold-bright outline-none placeholder:text-gold-faint"
                    />
                    {mentionMatches.length > 0 && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-full border border-line-2 bg-panel shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                        {mentionMatches.map((candidate, i) => (
                          <button
                            key={candidateKey(candidate)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(card, candidate);
                            }}
                            className={`flex w-full flex-col items-start px-2 py-1 text-left ${
                              i === mentionHighlight ? "bg-panel-2 text-gold" : "text-gold-dim hover:bg-panel-2"
                            }`}
                          >
                            {candidate.kind === "entity" ? (
                              <>
                                <span className="truncate text-[10px] font-semibold">
                                  {plainText(candidate.entity.name)}
                                </span>
                                <span className="text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                                  {candidate.entity.kind} · {candidate.entity.fileNo}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="truncate text-[10px] font-semibold">
                                  {notePreview(candidate.note.text)}
                                </span>
                                <span className="text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                                  Evidence · {candidate.boardName}
                                </span>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    onClick={() => !connectMode && !deleteMode && startEdit(card)}
                    className="min-h-8 px-2 py-1.5 text-[11px] leading-snug whitespace-pre-wrap break-words text-gold-dim"
                  >
                    {parseReferences(card.text, entities, notesById).map((seg, i) => {
                      if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
                      const label =
                        seg.kind === "entity-ref"
                          ? plainText(seg.entity.name)
                          : seg.note.boardId === boardId
                            ? notePreview(seg.note.text)
                            : `${boardNamesById.get(seg.note.boardId) ?? "Other Board"}: ${notePreview(seg.note.text)}`;
                      if (connectMode || deleteMode) {
                        return (
                          <span
                            key={i}
                            className="mx-0.5 inline-flex items-center border border-gold-dim/60 bg-gold/10 px-1 py-0.5 text-[10px] font-semibold text-gold"
                          >
                            {label}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (seg.kind === "entity-ref") openEntity(seg.entity);
                            else onOpenNoteRef(seg.note);
                          }}
                          className="mx-0.5 inline-flex cursor-pointer items-center border border-gold-dim/60 bg-gold/10 px-1 py-0.5 text-[10px] font-semibold text-gold hover:border-gold hover:bg-gold/20"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {confirmTarget && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="hud-corners panel-glow w-[320px] border border-danger/40 bg-panel/95 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold tracking-[0.2em] text-danger uppercase">
              {confirmTarget.kind === "note" ? "Delete Evidence?" : "Delete Connection?"}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-gold-dim">
              {confirmTarget.kind === "note"
                ? `Permanently delete ${confirmTarget.preview}? This can't be undone.`
                : "Permanently delete this connection? This can't be undone."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmTarget(null)} className="fc-btn px-3 py-1 text-[10px]">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="fc-btn border-danger bg-danger/15 px-3 py-1 text-[10px] text-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
