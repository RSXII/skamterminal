"use client";

import { useCallback, useRef, useState } from "react";
import { APPS, APP_LIST } from "@/lib/apps";
import type { WindowState } from "@/lib/types";
import type { Role } from "@/lib/auth";
import { SessionProvider } from "@/lib/session";
import { NavigationProvider, type AppFocus } from "@/lib/navigation";
import { OSWindow } from "@/components/os/Window";
import { Taskbar } from "@/components/os/Taskbar";
import { SkamSigil } from "@/components/os/icons";

export function Desktop({ user, role, onLogout }: { user: string; role: Role; onLogout: () => void }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<Partial<Record<string, AppFocus>>>({});
  const nextId = useRef(1);
  const nextZ = useRef(10);

  const focusedId =
    windows.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null;

  const openApp = useCallback((appId: string) => {
    const app = APPS[appId];
    if (!app) return;
    setWindows((wins) => {
      // Single instance per app: restore + focus if already open.
      const existing = wins.find((w) => w.appId === appId);
      if (existing) {
        return wins.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: nextZ.current++ } : w
        );
      }
      const offset = (wins.length % 5) * 28;
      const vw = window.innerWidth;
      const vh = window.innerHeight - 48; // taskbar
      const w = Math.min(app.defaultSize.w, vw - 40);
      const h = Math.min(app.defaultSize.h, vh - 40);
      return [
        ...wins,
        {
          id: nextId.current++,
          appId,
          x: Math.max(12, (vw - w) / 2 + offset - 56),
          y: Math.max(12, (vh - h) / 2 + offset - 56),
          w,
          h,
          z: nextZ.current++,
          minimized: false,
          maximized: false,
        },
      ];
    });
  }, []);

  const navigate = useCallback(
    (focus: AppFocus) => {
      openApp(focus.app);
      setPendingFocus((prev) => ({ ...prev, [focus.app]: focus }));
    },
    [openApp]
  );

  const consumeFocus = useCallback((appId: string) => {
    setPendingFocus((prev) => ({ ...prev, [appId]: undefined }));
  }, []);

  const focusWindow = useCallback((id: number) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, z: nextZ.current++ } : w))
    );
  }, []);

  const moveWindow = useCallback((id: number, x: number, y: number) => {
    setWindows((wins) => wins.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const resizeWindow = useCallback((id: number, w: number, h: number) => {
    setWindows((wins) => wins.map((win) => (win.id === id ? { ...win, w, h } : win)));
  }, []);

  const toggleMaximize = useCallback((id: number) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, z: nextZ.current++ } : w))
    );
  }, []);

  const minimizeWindow = useCallback((id: number) => {
    setWindows((wins) =>
      wins.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, []);

  const closeWindow = useCallback((id: number) => {
    setWindows((wins) => wins.filter((w) => w.id !== id));
  }, []);

  const taskClick = useCallback(
    (id: number) => {
      setWindows((wins) =>
        wins.map((w) => {
          if (w.id !== id) return w;
          if (w.minimized || w.id !== focusedId) {
            return { ...w, minimized: false, z: nextZ.current++ };
          }
          return { ...w, minimized: true };
        })
      );
    },
    [focusedId]
  );

  return (
    <SessionProvider value={{ user, role }}>
    <NavigationProvider value={{ navigate, pendingFocus, consumeFocus }}>
    <div className="absolute inset-0" onPointerDown={() => setSelectedIcon(null)}>
      {/* wallpaper */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <SkamSigil className="h-[55vh] w-[55vh] opacity-[0.05]" />
        <div className="absolute bottom-16 right-8 text-right font-[family-name:var(--font-tech)] text-[10px] leading-relaxed tracking-[0.2em] text-gold-faint">
          FCOS v7.3.1
          <br />
          S.K.AM ADVANCED MAGITECHNOLOGIES
        </div>
      </div>

      {/* desktop icons */}
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        {APP_LIST.map((app) => {
          const Icon = app.icon;
          const selected = selectedIcon === app.id;
          return (
            <button
              key={app.id}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setSelectedIcon(app.id)}
              onDoubleClick={() => {
                setSelectedIcon(null);
                openApp(app.id);
              }}
              className={`flex w-24 flex-col items-center gap-1.5 border p-3 transition-colors ${
                selected
                  ? "border-gold-dim bg-panel-2/80"
                  : "border-transparent hover:border-line hover:bg-panel/50"
              }`}
            >
              <Icon className="h-9 w-9 text-gold" />
              <span className="text-center text-[10px] font-semibold leading-tight tracking-[0.1em] text-gold-dim uppercase">
                {app.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* windows */}
      {windows.map((win) => {
        const app = APPS[win.appId];
        if (!app) return null;
        const AppComponent = app.component;
        return (
          <OSWindow
            key={win.id}
            win={win}
            title={app.name}
            focused={win.id === focusedId}
            minSize={app.minSize}
            onFocus={() => focusWindow(win.id)}
            onMove={(x, y) => moveWindow(win.id, x, y)}
            onResize={(w, h) => resizeWindow(win.id, w, h)}
            onMinimize={() => minimizeWindow(win.id)}
            onMaximizeToggle={() => toggleMaximize(win.id)}
            onClose={() => closeWindow(win.id)}
          >
            <AppComponent />
          </OSWindow>
        );
      })}

      <Taskbar
        user={user}
        role={role}
        windows={windows}
        apps={APPS}
        focusedId={focusedId}
        onTaskClick={taskClick}
        onOpenApp={openApp}
        onLogout={onLogout}
      />
    </div>
    </NavigationProvider>
    </SessionProvider>
  );
}
