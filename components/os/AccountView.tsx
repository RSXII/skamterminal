"use client";

import { useMemo } from "react";
import { PortraitPlaceholder } from "@/components/os/icons";
import { initials } from "@/lib/text";
import type { Role } from "@/lib/auth";

/** Deterministic fake session details so the same operator sees the same "record" every time. */
function fakeSessionFields(user: string) {
  let hash = 0;
  for (let i = 0; i < user.length; i++) hash = (hash * 31 + user.charCodeAt(i)) >>> 0;
  const sigil = hash.toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
  const node = 100 + (hash % 900);
  return {
    seed: hash % 100,
    binderSigil: `SKAM-${sigil}`,
    accessNode: `FCOS-NODE-${node}`,
    since: "SESSION START",
  };
}

export function AccountView({
  user,
  role,
  onClose,
}: {
  user: string;
  role: Role;
  onClose: () => void;
}) {
  const { seed, binderSigil, accessNode } = useMemo(() => fakeSessionFields(user), [user]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="hud-corners panel-glow w-[360px] border border-line bg-panel/95 p-8 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex flex-col items-center">
          <PortraitPlaceholder seed={seed} initials={initials(user)} className="mb-4 h-24 w-24" />
          <div className="text-xl font-semibold tracking-[0.25em] text-gold glow">{user}</div>
          <div className="mt-1 font-[family-name:var(--font-tech)] text-[10px] tracking-[0.25em] text-gold-dim">
            CLEARANCE: {role === "admin" ? "OMEGA" : "STANDARD"}
          </div>
        </div>

        <div className="space-y-2.5 border-t border-line pt-5 font-[family-name:var(--font-tech)] text-[10px] tracking-[0.15em]">
          <div className="flex items-center justify-between">
            <span className="text-gold-faint">BINDER SIGIL</span>
            <span className="text-gold-dim">{binderSigil}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gold-faint">ACCESS NODE</span>
            <span className="text-gold-dim">{accessNode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gold-faint">CONNECTION</span>
            <span className="text-gold-dim">● SECURE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gold-faint">STATUS</span>
            <span className="text-gold-dim">ACTIVE</span>
          </div>
        </div>

        <button onClick={onClose} className="fc-btn mt-7 w-full">
          Close
        </button>
      </div>
    </div>
  );
}
