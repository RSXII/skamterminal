"use client";

import { useState } from "react";
import { AccountView } from "@/components/os/AccountView";
import { initials } from "@/lib/text";
import { APP_LIST } from "@/lib/apps";
import type { Role } from "@/lib/auth";

export function StartMenu({
  user,
  role,
  onOpenApp,
  onLogout,
  onClose,
}: {
  user: string;
  role: Role;
  onOpenApp: (appId: string) => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onClose} />
      <div
        className="hud-corners panel-glow absolute bottom-full left-0 z-50 mb-1 flex max-h-[calc(100vh-64px)] w-72 flex-col overflow-y-auto border border-line bg-panel/95 backdrop-blur-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* user header */}
        <button
          onClick={() => setAccountOpen(true)}
          className="flex items-center gap-3 border-b border-line bg-panel-2/60 p-4 text-left transition-colors hover:bg-panel-2"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-line-2 bg-panel-2 text-xs font-bold tracking-wider text-gold">
            {initials(user)}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-[0.15em] text-gold">{user}</div>
            <div className="mt-0.5 font-[family-name:var(--font-tech)] text-[9px] tracking-[0.2em] text-gold-dim">
              CLEARANCE: {role === "admin" ? "OMEGA" : "STANDARD"}
            </div>
          </div>
        </button>

        {/* apps */}
        <div className="flex flex-col gap-0.5 p-2">
          {APP_LIST.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => {
                  onOpenApp(app.id);
                  onClose();
                }}
                className="flex items-center gap-3 border border-transparent px-2.5 py-2 text-left transition-colors hover:border-line hover:bg-panel-2/70"
              >
                <Icon className="h-5 w-5 shrink-0 text-gold" />
                <span className="text-xs font-semibold tracking-[0.1em] text-gold-dim uppercase">
                  {app.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* footer */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 border-t border-line px-4 py-3 text-left text-gold-dim transition-colors hover:bg-panel-2/70 hover:text-danger"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2 H3 v12 h3 M10 5 l3 3 -3 3 M13 8 H6" />
          </svg>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">Log Out</span>
        </button>
      </div>

      {accountOpen && (
        <AccountView
          user={user}
          role={role}
          onClose={() => {
            setAccountOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
