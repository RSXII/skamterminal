"use client";

import { MouseTrail } from "@/components/os/MouseTrail";
import { useCallback, useEffect, useState } from "react";
import { BootSequence } from "@/components/os/BootSequence";
import { LoginScreen } from "@/components/os/LoginScreen";
import { Desktop } from "@/components/os/Desktop";
import { getLastUser } from "@/lib/data";
import { playClick } from "@/lib/sound";
import type { Role } from "@/lib/auth";

type Phase = "boot" | "login" | "desktop";

export function FCOS() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [user, setUser] = useState("");
  const [role, setRole] = useState<Role>("player");

  // Global UI click sound: any interactive element anywhere in the OS.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(
          "button, a, input, select, textarea, [role='button'], [data-clickable]"
        )
      ) {
        playClick();
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  // Auth is a cosmetic role gate now (see lib/auth.ts) — skipping straight
  // to the desktop after boot, as a "player", is what lets a GM's "send
  // location" signal actually land somewhere instead of stalling on a form
  // nobody's there to fill in. Anyone who wants admin tools (or just wants
  // the login ritual) can still reach LoginScreen the normal way, via Log
  // Out, and type the real admin credentials.
  const handleBootComplete = useCallback(() => {
    const saved = getLastUser().trim();
    setUser(saved ? saved.toUpperCase().replace(/\s+/g, "_") : "GUEST-OPERATOR");
    setRole("player");
    setPhase("desktop");
  }, []);
  const handleLogin = useCallback((username: string, loginRole: Role) => {
    setUser(username);
    setRole(loginRole);
    setPhase("desktop");
  }, []);
  const handleLogout = useCallback(() => {
    setUser("");
    setRole("player");
    setPhase("login");
  }, []);

  return (
    <div className="crt fixed inset-0 overflow-hidden bg-ink select-none">
      <MouseTrail />
      {phase === "boot" && <BootSequence onComplete={handleBootComplete} />}
      {phase === "login" && <LoginScreen onLogin={handleLogin} />}
      {phase === "desktop" && <Desktop user={user} role={role} onLogout={handleLogout} />}
    </div>
  );
}
