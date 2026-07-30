"use client";

import { ReactNode, useCallback, useRef } from "react";
import type { WindowState } from "@/lib/types";

const TASKBAR_H = 48;
const DEFAULT_MIN_SIZE = { w: 320, h: 220 };

interface WindowProps {
  win: WindowState;
  title: string;
  focused: boolean;
  minSize?: { w: number; h: number };
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onMinimize: () => void;
  onMaximizeToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function OSWindow({
  win,
  title,
  focused,
  minSize = DEFAULT_MIN_SIZE,
  onFocus,
  onMove,
  onResize,
  onMinimize,
  onMaximizeToggle,
  onClose,
  children,
}: WindowProps) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) return;
      if ((e.target as HTMLElement).closest("button")) return;
      drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.x, win.y, win.maximized]
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

  const onResizeHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onFocus();
      resize.current = { startX: e.clientX, startY: e.clientY, startW: win.w, startH: win.h };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.w, win.h, onFocus]
  );

  const onResizeHandlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resize.current) return;
      const { startX, startY, startW, startH } = resize.current;
      const w = Math.max(minSize.w, Math.min(startW + (e.clientX - startX), window.innerWidth - win.x - 8));
      const h = Math.max(
        minSize.h,
        Math.min(startH + (e.clientY - startY), window.innerHeight - TASKBAR_H - win.y - 8)
      );
      onResize(w, h);
    },
    [onResize, minSize.w, minSize.h, win.x, win.y]
  );

  const onResizeHandlePointerUp = useCallback(() => {
    resize.current = null;
  }, []);

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: `calc(100% - ${TASKBAR_H}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <div
      className={`window-open absolute flex flex-col border bg-panel/95 backdrop-blur-sm ${
        focused ? "border-gold-dim panel-glow" : "border-line"
      }`}
      style={{
        ...style,
        // Hide rather than unmount so app state survives minimize.
        display: win.minimized ? "none" : undefined,
      }}
      onPointerDown={onFocus}
    >
      {/* title bar */}
      <div
        className={`flex h-8 shrink-0 items-center justify-between border-b px-3 ${
          win.maximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        } ${focused ? "border-line-2 bg-panel-2" : "border-line bg-panel"}`}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          onMaximizeToggle();
        }}
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
            onClick={onMaximizeToggle}
            aria-label={win.maximized ? "Restore" : "Maximize"}
            className="flex h-5 w-6 items-center justify-center border border-line text-gold-dim transition-colors hover:border-gold hover:text-gold-bright"
          >
            {win.maximized ? (
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 1 h5 v5 M3 1 L1 3 M1 3 h5 v5 L8 6" strokeLinejoin="round" />
                <rect x="1" y="3" width="5" height="5" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="8" height="8" />
              </svg>
            )}
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

      {!win.maximized && (
        <div
          onPointerDown={onResizeHandlePointerDown}
          onPointerMove={onResizeHandlePointerMove}
          onPointerUp={onResizeHandlePointerUp}
          aria-label="Resize"
          className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize touch-none"
        >
          <svg viewBox="0 0 10 10" className="h-full w-full text-gold-faint">
            <path d="M9 3 L3 9 M9 6 L6 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
}
