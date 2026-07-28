"use client";

import { ReactNode, useCallback, useRef } from "react";
import type { WindowState } from "@/lib/types";

interface WindowProps {
  win: WindowState;
  title: string;
  focused: boolean;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onMinimize: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function OSWindow({
  win,
  title,
  focused,
  onFocus,
  onMove,
  onMinimize,
  onClose,
  children,
}: WindowProps) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.x, win.y]
  );

  const onTitlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const x = Math.max(-win.w + 120, Math.min(e.clientX - drag.current.dx, window.innerWidth - 60));
      const y = Math.max(0, Math.min(e.clientY - drag.current.dy, window.innerHeight - 80));
      onMove(x, y);
    },
    [onMove, win.w]
  );

  const onTitlePointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      className={`window-open absolute flex flex-col border bg-panel/95 backdrop-blur-sm ${
        focused ? "border-gold-dim panel-glow" : "border-line"
      }`}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        // Hide rather than unmount so app state survives minimize.
        display: win.minimized ? "none" : undefined,
      }}
      onPointerDown={onFocus}
    >
      {/* title bar */}
      <div
        className={`flex h-8 shrink-0 cursor-grab items-center justify-between border-b px-3 active:cursor-grabbing ${
          focused ? "border-line-2 bg-panel-2" : "border-line bg-panel"
        }`}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
      >
        <div
          className={`truncate text-xs font-semibold tracking-[0.2em] uppercase ${
            focused ? "text-gold glow" : "text-gold-dim"
          }`}
        >
          {title}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            aria-label="Minimize"
            className="flex h-5 w-6 items-center justify-center border border-line text-gold-dim transition-colors hover:border-gold hover:text-gold-bright"
          >
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 7 h8" />
            </svg>
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-5 w-6 items-center justify-center border border-line text-gold-dim transition-colors hover:border-danger hover:text-danger"
          >
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2 l6 6 M8 2 l-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* app content */}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
