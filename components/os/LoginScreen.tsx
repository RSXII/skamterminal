"use client";

import { FormEvent, useEffect, useState } from "react";
import { SkamSigil } from "@/components/os/icons";
import { getLastUser, setLastUser } from "@/lib/data";
import { playChime, playError } from "@/lib/sound";

export function LoginScreen({ onLogin }: { onLogin: (user: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    setUsername(getLastUser());
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (authenticating) return;
    if (!username.trim() || !password.trim()) {
      playError();
      setError("CREDENTIALS REQUIRED");
      return;
    }
    setError("");
    setAuthenticating(true);
    // Placeholder auth: any credentials pass. Swap for a real check later.
    setTimeout(() => {
      const handle = username.trim().toUpperCase().replace(/\s+/g, "_");
      setLastUser(username.trim());
      playChime();
      onLogin(handle);
    }, 1100);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* faint watermark sigil */}
      <SkamSigil className="pointer-events-none absolute right-[6%] top-1/2 h-[60vh] w-[60vh] -translate-y-1/2 opacity-[0.045]" />

      <div className="absolute top-6 left-8 font-[family-name:var(--font-tech)] text-[10px] tracking-[0.25em] text-gold-dim">
        ● SYS-ONLINE&nbsp;&nbsp;&nbsp;● SECURE CONNECTION
      </div>
      <div className="absolute top-6 right-8 font-[family-name:var(--font-tech)] text-[10px] tracking-[0.25em] text-gold-dim">
        {clock}
      </div>

      <form
        onSubmit={submit}
        className="hud-corners panel-glow w-[380px] border border-line bg-panel/80 p-10 backdrop-blur-sm"
      >
        <div className="mb-8 flex flex-col items-center">
          <SkamSigil className="mb-4 h-16 w-16" />
          <div className="text-3xl font-semibold tracking-[0.4em] text-gold glow">
            FCOS
          </div>
          <div className="mt-1 text-[10px] tracking-[0.3em] text-gold-dim">
            S.K.AM ADVANCED MAGITECHNOLOGIES
          </div>
        </div>

        <label className="mb-1 block text-[10px] tracking-[0.25em] text-gold-dim">
          OPERATOR ID
        </label>
        <input
          className="fc-input mb-4 w-full"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />

        <label className="mb-1 block text-[10px] tracking-[0.25em] text-gold-dim">
          BINDING PHRASE
        </label>
        <input
          type="password"
          className="fc-input mb-6 w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="mb-4 text-center font-[family-name:var(--font-tech)] text-xs text-danger">
            ✕ {error}
          </div>
        )}

        <button type="submit" className="fc-btn w-full" disabled={authenticating}>
          {authenticating ? (
            <span className="blink">VERIFYING SIGIL…</span>
          ) : (
            "Authenticate"
          )}
        </button>

        <div className="mt-6 text-center text-[9px] tracking-[0.2em] text-gold-faint">
          UNAUTHORIZED ACCESS IS PUNISHABLE
          <br />
          UNDER THE CONCORD ACCORDS
        </div>
      </form>
    </div>
  );
}
