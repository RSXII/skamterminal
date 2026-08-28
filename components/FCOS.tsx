"use client";

import { useCallback, useEffect, useState } from "react";
import { BootSequence } from "@/components/os/BootSequence";
import { LoginScreen } from "@/components/os/LoginScreen";
import { Desktop } from "@/components/os/Desktop";
import { getLastUser } from "@/lib/data";
import { playClick } from "@/lib/sound";

type Phase = "boot" | "login" | "desktop";

export function FCOS() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [user, setUser] = useState("");

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

  // Auth is already just a formality here (LoginScreen accepts any
  // credentials) — skipping straight to the desktop after boot is what
  // lets a GM's "send location" signal actually land somewhere instead of
  // stalling on a form nobody's there to fill in. Anyone who wants to
  // identify as someone else (or just wants the login ritual) can still
  // get to LoginScreen the normal way, via Log Out.
  const handleBootComplete = useCallback(() => {
    const saved = getLastUser().trim();
    setUser(saved ? saved.toUpperCase().replace(/\s+/g, "_") : "GUEST-OPERATOR");
    setPhase("desktop");
  }, []);
  const handleLogin = useCallback((username: string) => {
    setUser(username);
    setPhase("desktop");
  }, []);
  const handleLogout = useCallback(() => {
    setUser("");
    setPhase("login");
  }, []);

  return (
    <div className="crt fixed inset-0 overflow-hidden bg-ink select-none">
      {phase === "boot" && <BootSequence onComplete={handleBootComplete} />}
      {phase === "login" && <LoginScreen onLogin={handleLogin} />}
      {phase === "desktop" && <Desktop user={user} onLogout={handleLogout} />}
    </div>
  );
}
