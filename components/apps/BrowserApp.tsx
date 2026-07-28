"use client";

import { FormEvent, useState } from "react";
import { isExternalUrl, normalizeUrl, resolveSite } from "@/data/sites";
import type { FakeSite } from "@/lib/types";
import { SkamSigil } from "@/components/os/icons";
import { playError } from "@/lib/sound";

type PageState =
  | { kind: "home" }
  | { kind: "site"; site: FakeSite; url: string }
  | { kind: "external"; url: string }
  | { kind: "notfound"; url: string };

function HomePage({ onNavigate }: { onNavigate: (url: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <SkamSigil className="h-16 w-16 opacity-40" />
      <div className="text-sm tracking-[0.3em] text-gold-dim">AETHERNET NAVIGATOR</div>
      <div className="text-center text-[10px] leading-relaxed tracking-[0.15em] text-gold-faint">
        ENTER A DESTINATION SIGIL ABOVE
        <br />
        KNOWN DESTINATIONS:
      </div>
      <div className="flex gap-2">
        {["purrfect.aet", "gildedkey.aet"].map((u) => (
          <button
            key={u}
            onClick={() => onNavigate(u)}
            className="border border-line px-3 py-1.5 font-[family-name:var(--font-tech)] text-xs text-gold-dim transition-colors hover:border-gold-dim hover:text-gold"
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotFoundPage({ url }: { url: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-4xl text-gold-faint">⚠</div>
      <div className="text-sm font-bold tracking-[0.3em] text-danger/90">SIGNAL LOST</div>
      <div className="font-[family-name:var(--font-tech)] text-xs text-gold-dim">
        No relay responds at “{url}”
      </div>
      <div className="text-[10px] tracking-[0.15em] text-gold-faint">
        THE DESTINATION MAY BE WARDED, UNBOUND, OR FICTIONAL
      </div>
    </div>
  );
}

export function BrowserApp() {
  const [input, setInput] = useState("");
  const [page, setPage] = useState<PageState>({ kind: "home" });

  const navigate = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) {
      setPage({ kind: "home" });
      setInput("");
      return;
    }
    setInput(url);
    const site = resolveSite(url);
    if (site) {
      setPage({ kind: "site", site, url });
    } else if (isExternalUrl(url)) {
      // Attempt to iframe a real external page. Many sites forbid framing
      // (X-Frame-Options / CSP) and will render blank.
      setPage({ kind: "external", url: `https://${url}` });
    } else {
      playError();
      setPage({ kind: "notfound", url });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(input);
  };

  const SiteComponent = page.kind === "site" ? page.site.component : null;

  return (
    <div className="flex h-full flex-col bg-ink-2">
      {/* address bar */}
      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-center gap-2 border-b border-line bg-panel px-2 py-1.5"
      >
        <button
          type="button"
          aria-label="Home"
          onClick={() => {
            setInput("");
            setPage({ kind: "home" });
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-line text-gold-dim transition-colors hover:border-gold-dim hover:text-gold"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M2 6 L6 2.5 L10 6 M3.5 5.5 V10 h5 V5.5" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 border border-line-2 bg-ink px-2">
          <span className="shrink-0 font-[family-name:var(--font-tech)] text-[10px] text-gold-faint">
            aether://
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="enter destination"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent py-1 font-[family-name:var(--font-tech)] text-xs text-gold-bright outline-none placeholder:text-gold-faint"
          />
          {page.kind !== "home" && (
            <span className="shrink-0 text-[9px] tracking-[0.15em] text-gold-faint">
              {page.kind === "site" ? "● BOUND" : page.kind === "external" ? "◐ EXT" : "✕ LOST"}
            </span>
          )}
        </div>
        <button type="submit" className="fc-btn shrink-0 !px-3 !py-1 text-[10px]">
          Go
        </button>
      </form>

      {/* viewport */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {page.kind === "home" && <HomePage onNavigate={navigate} />}
        {page.kind === "site" && SiteComponent && (
          <div className="h-full">
            <SiteComponent />
          </div>
        )}
        {page.kind === "external" && (
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-line bg-panel/60 px-3 py-1 text-[9px] tracking-[0.15em] text-gold-faint">
              EXTERNAL SIGNAL — SOME HOSTS REFUSE FRAMING AND WILL RENDER BLANK
            </div>
            <iframe
              src={page.url}
              title={page.url}
              className="min-h-0 flex-1 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
        {page.kind === "notfound" && <NotFoundPage url={page.url} />}
      </div>
    </div>
  );
}
