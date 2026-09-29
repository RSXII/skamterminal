"use client";

import { useEffect, useState } from "react";
import { SkamSigil, SpeakerIcon } from "@/components/os/icons";
import { StartMenu } from "@/components/os/StartMenu";
import { getVolume, setVolume as setGlobalVolume, playClick } from "@/lib/sound";
import type { AppDefinition, WindowState } from "@/lib/types";
import type { Role } from "@/lib/auth";

interface TaskbarProps {
  user: string;
  role: Role;
  windows: WindowState[];
  apps: Record<string, AppDefinition>;
  focusedId: number | null;
  onTaskClick: (winId: number) => void;
  onOpenApp: (appId: string) => void;
  onLogout: () => void;
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = now
    .toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  return (
    <div className="text-right font-[family-name:var(--font-tech)] leading-tight">
      <div className="text-sm text-gold">{time}</div>
      <div className="text-[9px] tracking-[0.15em] text-gold-dim">{date}</div>
    </div>
  );
}

function VolumeControl() {
  const [volume, setVolume] = useState(0.5);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setVolume(getVolume());
  }, []);

  const update = (v: number) => {
    setVolume(v);
    setGlobalVolume(v);
  };

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Volume"
        className={`flex h-7 w-7 items-center justify-center transition-colors ${
          open ? "text-gold-bright" : "text-gold-dim hover:text-gold"
        }`}
      >
        <SpeakerIcon className="h-4.5 w-4.5" muted={volume === 0} />
      </button>
      {open && (
        <div className="hud-corners panel-glow absolute bottom-10 right-0 flex w-44 items-center gap-3 border border-line bg-panel p-3">
          <SpeakerIcon className="h-4 w-4 shrink-0 text-gold-dim" muted={volume === 0} />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => update(parseInt(e.target.value, 10) / 100)}
            onPointerUp={() => playClick()}
            className="fc-range w-full"
            style={{ "--fill": `${Math.round(volume * 100)}%` } as React.CSSProperties}
            aria-label="System volume"
          />
          <span className="w-7 shrink-0 text-right font-[family-name:var(--font-tech)] text-[10px] text-gold-dim">
            {Math.round(volume * 100)}
          </span>
        </div>
      )}
    </div>
  );
}

export function Taskbar({ user, role, windows, apps, focusedId, onTaskClick, onOpenApp, onLogout }: TaskbarProps) {
  const [startOpen, setStartOpen] = useState(false);

  return (
    <div className="absolute inset-x-0 bottom-0 z-[5000] flex h-12 items-center gap-3 border-t border-line bg-ink-2/95 px-3 backdrop-blur">
      {/* start button (emblem + user) */}
      <div className="relative shrink-0 self-stretch border-r border-line">
        <button
          onClick={() => setStartOpen((o) => !o)}
          className={`flex h-full items-center gap-2.5 py-1.5 pr-3 transition-colors ${
            startOpen ? "text-gold-bright" : "hover:text-gold-bright"
          }`}
        >
          <SkamSigil className="h-6 w-6" />
          <div className="text-left leading-tight">
            <div className="text-[11px] font-bold tracking-[0.3em] text-gold">FCOS</div>
            <div className="font-[family-name:var(--font-tech)] text-[8px] tracking-[0.1em] text-gold-dim">
              USER: {user}
            </div>
          </div>
        </button>

        {startOpen && (
          <StartMenu
            user={user}
            role={role}
            onOpenApp={onOpenApp}
            onLogout={onLogout}
            onClose={() => setStartOpen(false)}
          />
        )}
      </div>

      {/* running windows */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {windows.map((w) => {
          const app = apps[w.appId];
          if (!app) return null;
          const Icon = app.icon;
          const active = w.id === focusedId && !w.minimized;
          return (
            <button
              key={w.id}
              onClick={() => onTaskClick(w.id)}
              className={`flex h-8 items-center gap-2 border px-2.5 text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors ${
                active
                  ? "border-gold-dim bg-panel-2 text-gold glow"
                  : w.minimized
                    ? "border-line text-gold-faint hover:text-gold-dim"
                    : "border-line text-gold-dim hover:text-gold"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="max-w-28 truncate">{app.name}</span>
            </button>
          );
        })}
      </div>

      {/* tray */}
      <div className="flex items-center gap-3 border-l border-line pl-3">
        <div className="hidden font-[family-name:var(--font-tech)] text-[9px] tracking-[0.2em] text-gold-faint md:block">
          ● SECURE&nbsp;&nbsp;CLEARANCE: {role === "admin" ? "OMEGA" : "STANDARD"}
        </div>
        <VolumeControl />
        <Clock />
        <button
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="flex h-7 w-7 items-center justify-center border border-line text-gold-dim transition-colors hover:border-danger hover:text-danger"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2 H3 v12 h3 M10 5 l3 3 -3 3 M13 8 H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
