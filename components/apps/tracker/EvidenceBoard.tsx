"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { fetchEntities } from "@/lib/entities";
import {
  createBoard,
  deleteBoard,
  renameBoard,
  subscribeAllNotes,
  subscribeBoards,
} from "@/lib/tracker";
import type { Entity, EvidenceNote, TrackerBoard } from "@/lib/types";
import { BoardCanvas, type FocusRequest } from "@/components/apps/tracker/BoardCanvas";

export function EvidenceBoard() {
  const { user } = useSession();
  const [boards, setBoards] = useState<TrackerBoard[]>([]);
  const [boardsStatus, setBoardsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [allNotes, setAllNotes] = useState<EvidenceNote[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [savingBoard, setSavingBoard] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrackerBoard | null>(null);
  const focusNonce = useRef(0);
  const skipNextBlurRef = useRef(false);

  useEffect(() => {
    fetchEntities()
      .then(setEntities)
      .catch((err) => console.error("Failed to load entities for references:", err));
  }, []);

  useEffect(() => {
    setBoardsStatus("loading");
    const unsub = subscribeBoards(
      (list) => {
        setBoards([...list].sort((a, b) => a.createdAt - b.createdAt));
        setBoardsStatus("ready");
      },
      (err) => {
        console.error("Failed to reach evidence boards:", err);
        setBoardsStatus("error");
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeAllNotes(setAllNotes, (err) =>
      console.error("Failed to reach evidence notes:", err),
    );
    return unsub;
  }, []);

  // Default to the first board once boards load, and fall back to whatever's left if the
  // active one gets deleted (by this player or another) instead of showing a dead tab.
  useEffect(() => {
    if (activeBoardId && boards.some((b) => b.id === activeBoardId)) return;
    setActiveBoardId(boards[0]?.id ?? null);
  }, [boards, activeBoardId]);

  const boardNamesById = useMemo(() => new Map(boards.map((b) => [b.id, b.name])), [boards]);
  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null;

  async function handleCreateBoard() {
    const name = newBoardName.trim();
    setCreatingBoard(false);
    setNewBoardName("");
    if (!name) return;
    setSavingBoard(true);
    try {
      const id = await createBoard(name, user);
      setActiveBoardId(id);
    } catch (err) {
      console.error("Failed to create board:", err);
      alert("Save failed — check that Firestore write access is currently open.");
    } finally {
      setSavingBoard(false);
    }
  }

  async function handleRename(board: TrackerBoard) {
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!name || name === board.name) return;
    try {
      await renameBoard(board.id, name);
    } catch (err) {
      console.error("Failed to rename board:", err);
    }
  }

  async function handleDeleteBoard() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteBoard(target.id);
    } catch (err) {
      console.error("Failed to delete board:", err);
      alert("Delete failed — check that Firestore write access is currently open.");
    }
  }

  function openNoteRef(note: EvidenceNote) {
    focusNonce.current += 1;
    setActiveBoardId(note.boardId);
    setFocusRequest({ noteId: note.id, nonce: focusNonce.current });
  }

  const deleteTargetNoteCount = deleteTarget
    ? allNotes.filter((n) => n.boardId === deleteTarget.id).length
    : 0;

  return (
    <div className="flex h-full flex-col">
      {/* board tabs */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-panel/40 px-2 py-1.5">
        {boardsStatus === "loading" && (
          <span className="px-2 text-[10px] tracking-[0.15em] text-gold-faint">LOADING BOARDS…</span>
        )}
        {boardsStatus === "error" && (
          <span className="px-2 text-[10px] tracking-[0.1em] text-danger/80">
            CONNECTION FAILED — could not reach the shared database.
          </span>
        )}
        {boards.map((b) => {
          const active = b.id === activeBoardId;
          const isRenaming = renamingId === b.id;
          return (
            <div
              key={b.id}
              className={`flex items-center gap-1.5 border px-2 py-1 ${
                active ? "border-gold-dim bg-panel-2 text-gold" : "border-transparent text-gold-faint"
              }`}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => {
                    if (skipNextBlurRef.current) {
                      skipNextBlurRef.current = false;
                      return;
                    }
                    void handleRename(b);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      skipNextBlurRef.current = true;
                      void handleRename(b);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      skipNextBlurRef.current = true;
                      setRenamingId(null);
                    }
                  }}
                  className="w-32 border-b border-gold bg-transparent text-xs text-gold-bright outline-none"
                />
              ) : (
                <button
                  onClick={() => setActiveBoardId(b.id)}
                  onDoubleClick={() => {
                    setRenamingId(b.id);
                    setRenameDraft(b.name);
                  }}
                  className="max-w-40 truncate text-xs font-semibold tracking-[0.05em]"
                  title="Double-click to rename"
                >
                  {b.name}
                </button>
              )}
              {active && !isRenaming && (
                <button
                  onClick={() => setDeleteTarget(b)}
                  aria-label="Delete board"
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gold-faint hover:text-danger"
                >
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2 l6 6 M8 2 l-6 6" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        {creatingBoard ? (
          <input
            autoFocus
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onBlur={() => {
              if (skipNextBlurRef.current) {
                skipNextBlurRef.current = false;
                return;
              }
              void handleCreateBoard();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                skipNextBlurRef.current = true;
                void handleCreateBoard();
              } else if (e.key === "Escape") {
                e.preventDefault();
                skipNextBlurRef.current = true;
                setCreatingBoard(false);
                setNewBoardName("");
              }
            }}
            placeholder="Board name…"
            className="w-32 border-b border-gold bg-transparent px-1 py-1 text-xs text-gold-bright outline-none placeholder:text-gold-faint"
          />
        ) : (
          <button
            onClick={() => setCreatingBoard(true)}
            disabled={savingBoard}
            className="px-2 py-1 text-xs font-semibold tracking-[0.05em] text-gold-dim hover:text-gold disabled:opacity-50"
          >
            {savingBoard ? "Adding…" : "+ New Board"}
          </button>
        )}
      </div>

      {/* active board's canvas */}
      <div className="relative min-h-0 flex-1">
        {activeBoard ? (
          <BoardCanvas
            key={activeBoard.id}
            boardId={activeBoard.id}
            entities={entities}
            allNotes={allNotes}
            boardNamesById={boardNamesById}
            focusRequest={focusRequest}
            onConsumeFocus={() => setFocusRequest(null)}
            onOpenNoteRef={openNoteRef}
          />
        ) : (
          boardsStatus === "ready" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="text-xs tracking-[0.15em] text-gold-faint uppercase">No evidence boards yet</div>
              <button onClick={() => setCreatingBoard(true)} className="fc-btn px-3 py-1 text-[10px]">
                + New Board
              </button>
            </div>
          )
        )}
      </div>

      {deleteTarget && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="hud-corners panel-glow w-[340px] border border-danger/40 bg-panel/95 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-semibold tracking-[0.2em] text-danger uppercase">Delete Board?</div>
            <p className="mt-3 text-xs leading-relaxed text-gold-dim">
              {`Permanently delete "${deleteTarget.name}" and all ${deleteTargetNoteCount} note${
                deleteTargetNoteCount === 1 ? "" : "s"
              } on it, plus every connection between them? This can't be undone.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="fc-btn px-3 py-1 text-[10px]">
                Cancel
              </button>
              <button
                onClick={handleDeleteBoard}
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
