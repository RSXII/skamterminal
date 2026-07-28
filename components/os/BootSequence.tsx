"use client";

import { useEffect, useRef, useState } from "react";
import { SkamSigil } from "@/components/os/icons";
import { hasBootedBefore, markBooted } from "@/lib/data";

interface BootLine {
  text: string;
  delay: number; // ms after previous line
  ok?: boolean;
}

const BOOT_LINES: BootLine[] = [
  { text: "S.K.AM ADVANCED MAGITECHNOLOGIES", delay: 300 },
  { text: "FIRMAMENT CORE OPERATING SYSTEM v7.3.1", delay: 120 },
  { text: "COPYRIGHT 894–912 A.C. — ALL RIGHTS BOUND", delay: 200 },
  { text: "", delay: 350 },
  { text: "INITIALIZING AETHER BUS .............", delay: 260, ok: true },
  { text: "MANA CAPACITOR CHARGE ......... 98.2%", delay: 340, ok: true },
  { text: "BINDING SIGIL VERIFICATION ..........", delay: 420, ok: true },
  { text: "WARD LATTICE INTEGRITY ..............", delay: 240, ok: true },
  { text: "SCRYING RELAY HANDSHAKE .............", delay: 520, ok: true },
  { text: "LOADING GLYPH CACHE (2,048 SIGILS) ..", delay: 300, ok: true },
  { text: "MOUNTING /dev/leyline0 ..............", delay: 260, ok: true },
  { text: "CONCORD COMPLIANCE AUDIT ............", delay: 380, ok: true },
  { text: "", delay: 200 },
  { text: "SECURE CONNECTION ESTABLISHED", delay: 300 },
  { text: "SYS-ONLINE", delay: 250 },
];

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [fastBoot, setFastBoot] = useState(false);
  const skipped = useRef(false);
  const done = visibleCount >= BOOT_LINES.length;

  // Returning users get a fast boot; first boot plays the full sequence.
  // (Read after mount — localStorage isn't available during SSR.)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFastBoot(hasBootedBefore()));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (skipped.current) return;
    if (done) {
      markBooted();
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
    const line = BOOT_LINES[visibleCount];
    const delay = fastBoot ? Math.min(40, line.delay / 8) : line.delay;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [visibleCount, fastBoot, onComplete, done]);

  // Any key / click skips straight to login.
  useEffect(() => {
    const skip = () => {
      if (skipped.current) return;
      skipped.current = true;
      markBooted();
      onComplete();
    };
    const onKey = () => skip();
    const onClick = () => skip();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [onComplete]);

  const progress = Math.min(100, Math.round((visibleCount / BOOT_LINES.length) * 100));

  return (
    <div className="absolute inset-0 flex flex-col bg-ink font-[family-name:var(--font-tech)] text-sm">
      <div className="flex-1 p-8 md:p-14 overflow-hidden">
        <div className="mb-8 flex items-center gap-4">
          <SkamSigil className="h-12 w-12 flicker" />
          <div>
            <div className="text-lg tracking-[0.35em] text-gold glow">FCOS</div>
            <div className="text-[10px] tracking-[0.2em] text-gold-dim">
              FIRMAMENT CORE OPERATING SYSTEM
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {BOOT_LINES.slice(0, visibleCount).map((line, i) => (
            <div key={i} className="boot-line flex gap-3">
              {line.ok && <span className="text-gold-bright">[ OK ]</span>}
              <span className={line.ok ? "text-gold-dim" : "text-gold"}>{line.text}</span>
            </div>
          ))}
          {!done && <span className="blink text-gold">▮</span>}
        </div>
      </div>

      <div className="p-8 md:px-14">
        <div className="mb-2 flex justify-between text-[10px] tracking-[0.25em] text-gold-dim">
          <span>{done ? "BOOT COMPLETE" : "BINDING SYSTEMS…"}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 w-full bg-panel-2">
          <div
            className="h-full bg-gold transition-all duration-200"
            style={{ width: `${progress}%`, boxShadow: "0 0 12px rgba(232,163,61,0.8)" }}
          />
        </div>
        <div className="mt-3 text-center text-[10px] tracking-[0.25em] text-gold-faint">
          PRESS ANY KEY TO SKIP
        </div>
      </div>
    </div>
  );
}
