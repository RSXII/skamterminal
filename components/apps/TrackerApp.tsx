"use client";

import { useState } from "react";
import { EvidenceBoard } from "@/components/apps/tracker/EvidenceBoard";
import { TaskList } from "@/components/apps/tracker/TaskList";

type Tab = "board" | "tasks";

export function TrackerApp() {
  const [tab, setTab] = useState<Tab>("board");

  return (
    <div className="flex h-full flex-col bg-ink-2">
      <div className="flex shrink-0 border-b border-line bg-panel/60">
        {(
          [
            ["board", "Evidence Board"],
            ["tasks", "Task List"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`border-r border-line px-4 py-2 text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors ${
              tab === id
                ? "bg-panel-2 text-gold"
                : "text-gold-faint hover:bg-panel hover:text-gold-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "board" ? <EvidenceBoard /> : <TaskList />}
      </div>
    </div>
  );
}
