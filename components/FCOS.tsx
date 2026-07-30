"use client";

import { useCallback, useEffect, useState } from "react";
import { BootSequence } from "@/components/os/BootSequence";
import { LoginScreen } from "@/components/os/LoginScreen";
import { Desktop } from "@/components/os/Desktop";
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

  const handleBootComplete = useCallback(() => setPhase("login"), []);
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
      {phase === "boot" && <BootSequence onComplete={handleBootComplete} />}
      {phase === "login" && <LoginScreen onLogin={handleLogin} />}
      {phase === "desktop" && <Desktop user={user} role={role} onLogout={handleLogout} />}
    </div>
  );
}
