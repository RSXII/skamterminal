"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { createTask, deleteTask, setTaskVote, subscribeTasks } from "@/lib/tracker";
import type { TrackerTask } from "@/lib/types";

const MAX_VOTES_PER_PLAYER = 2;

function ThumbIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M7 9 V17 H4.5 V9 Z" />
      <path d="M7 9 L9.5 3 C11 3 11.5 4.5 11 6 L10 9 H14.5 C15.5 9 16.2 10 15.8 11 L14 16 C13.7 16.7 13 17 12.3 17 H7" />
    </svg>
  );
}

export function TaskList() {
  const { user } = useSession();
  const [tasks, setTasks] = useState<TrackerTask[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStatus("loading");
    const unsub = subscribeTasks(
      (list) => {
        setTasks([...list].sort((a, b) => a.createdAt - b.createdAt));
        setStatus("ready");
      },
      (err) => {
        console.error("Failed to reach the task list:", err);
        setStatus("error");
      },
    );
    return unsub;
  }, []);

  const myVoteCount = tasks.filter((t) => t.votes?.includes(user)).length;

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await createTask(text, user);
      setDraft("");
    } catch (err) {
      console.error("Failed to add task:", err);
      alert("Save failed — check that Firestore write access is currently open.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(task: TrackerTask) {
    const voted = task.votes?.includes(user);
    if (!voted && myVoteCount >= MAX_VOTES_PER_PLAYER) return;
    try {
      await setTaskVote(task.id, user, !voted);
    } catch (err) {
      console.error("Failed to update vote:", err);
    }
  }

  async function removeTask(id: string) {
    try {
      await deleteTask(id);
    } catch (err) {
      console.error("Failed to remove task:", err);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-panel/60 px-4 py-2">
        <span className="text-[10px] tracking-[0.3em] text-gold-dim">TASKS · {tasks.length}</span>
        <span className="font-[family-name:var(--font-tech)] text-[10px] tracking-[0.15em] text-gold-faint">
          YOUR VOTES: {myVoteCount}/{MAX_VOTES_PER_PLAYER}
        </span>
      </div>

      <form onSubmit={submitTask} className="flex shrink-0 gap-2 border-b border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task for the party…"
          disabled={submitting}
          className="fc-input flex-1 text-xs disabled:opacity-50"
        />
        <button type="submit" disabled={submitting || !draft.trim()} className="fc-btn px-3 py-1 text-[10px] disabled:opacity-50">
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" && (
          <div className="p-3 text-[10px] tracking-[0.15em] text-gold-faint">LOADING TASKS…</div>
        )}
        {status === "error" && (
          <div className="p-3 text-[10px] leading-relaxed tracking-[0.1em] text-danger/80">
            CONNECTION FAILED — could not reach the shared database.
          </div>
        )}
        {status === "ready" && tasks.length === 0 && (
          <div className="p-4 text-center text-xs text-gold-faint">No tasks on the board yet.</div>
        )}
        {tasks.map((task) => {
          const voted = task.votes?.includes(user) ?? false;
          const voteCount = task.votes?.length ?? 0;
          const canVote = voted || myVoteCount < MAX_VOTES_PER_PLAYER;
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 border-b border-line/50 px-4 py-3 text-xs"
            >
              <button
                onClick={() => toggleVote(task)}
                disabled={!canVote}
                title={!canVote ? `You've already used both votes` : voted ? "Remove your vote" : "Thumbs up"}
                className={`flex shrink-0 flex-col items-center gap-0.5 border px-2 py-1 transition-colors ${
                  voted
                    ? "border-gold bg-gold/15 text-gold-bright"
                    : "border-line-2 text-gold-dim hover:border-gold hover:text-gold"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <ThumbIcon className="h-4 w-4" />
                <span className="font-[family-name:var(--font-tech)] text-[10px]">{voteCount}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="leading-relaxed text-gold-dim">{task.text}</div>
                <div className="mt-1 text-[9px] tracking-[0.1em] text-gold-faint uppercase">
                  added by {task.createdBy}
                </div>
              </div>
              <button
                onClick={() => removeTask(task.id)}
                aria-label="Remove task"
                className="flex h-5 w-5 shrink-0 items-center justify-center border border-line text-gold-faint transition-colors hover:border-danger hover:text-danger"
              >
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 2 l6 6 M8 2 l-6 6" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
