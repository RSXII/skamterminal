"use client";

import { useEffect, useMemo, useRef } from "react";
import { ARROW, CURSOR_SCALE, HAND, HAND_HOTSPOT, cursorSvg, cursorUrl } from "@/lib/cursors";

// Ghost colors, nearest to farthest from the real pointer.
const TRAIL = ["#ff3fd0", "#ffa030", "#fff35c", "#4df0ff"];
const STEP_MS = 38;
const KEEP_MS = STEP_MS * (TRAIL.length + 2);

// Installs the pixel cursors as CSS variables (consumed by the VGA theme in
// globals.css) and renders a Windows-3.x-style mouse trail. Both are inert
// unless <html data-theme="vga">.
export function MouseTrail() {
  const ghosts = useRef<(HTMLDivElement | null)[]>([]);
  const images = useMemo(
    () => TRAIL.map((c) => `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(ARROW, c, "#000000"))}")`),
    []
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cursor-arrow", `${cursorUrl(ARROW)} 0 0`);
    root.style.setProperty(
      "--cursor-hand",
      `${cursorUrl(HAND)} ${HAND_HOTSPOT.x * CURSOR_SCALE} ${HAND_HOTSPOT.y * CURSOR_SCALE}`
    );

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !fine) return;

    const points: { x: number; y: number; t: number }[] = [];
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };

    const frame = (now: number) => {
      while (points.length > 1 && now - points[0].t > KEEP_MS) points.shift();
      const themed = root.dataset.theme === "vga";
      const head = points[points.length - 1];
      ghosts.current.forEach((el, i) => {
        if (!el) return;
        const target = now - (i + 1) * STEP_MS;
        let p = points[0];
        for (const q of points) if (q.t <= target) p = q;
        const visible =
          themed && head && p && now - head.t < KEEP_MS && Math.hypot(head.x - p.x, head.y - p.y) > 4;
        el.style.opacity = visible ? String(0.75 - i * 0.15) : "0";
        if (visible) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      });
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {images.map((img, i) => (
        <div
          key={i}
          ref={(el) => {
            ghosts.current[i] = el;
          }}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 opacity-0"
          style={{
            zIndex: 99990 - i,
            width: ARROW[0].length * CURSOR_SCALE,
            height: ARROW.length * CURSOR_SCALE,
            backgroundImage: img,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </>
  );
}
