"use client";

// Demo fake-website: a cat fancier page reachable at purrfect.aet in the
// in-OS browser. Serves as the template for future fake sites.

function CatIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden>
      <rect x="1" y="1" width="238" height="158" fill="rgba(232,163,61,0.06)" stroke="#57401d" />
      <g stroke="#e8a33d" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* body */}
        <path d="M85 130 C70 130 60 115 62 98 C64 84 74 76 88 74" />
        <path d="M155 130 C172 130 182 112 178 94 C175 80 164 72 152 72" />
        <path d="M85 130 h70" />
        {/* head */}
        <path d="M88 74 C86 52 92 40 100 34 L110 46 C116 43 124 43 130 46 L140 34 C148 40 154 52 152 72 C154 88 140 96 120 96 C100 96 86 90 88 74 Z" />
        {/* eyes */}
        <path d="M104 66 q4 -5 8 0" />
        <path d="M128 66 q4 -5 8 0" />
        {/* nose + mouth */}
        <path d="M118 76 h4 l-2 3 Z" fill="#e8a33d" />
        <path d="M120 79 v4 M120 83 q-5 5 -10 1 M120 83 q5 5 10 1" />
        {/* whiskers */}
        <path d="M96 76 h-18 M97 82 l-16 5 M144 76 h18 M143 82 l16 5" strokeWidth="1.2" opacity="0.7" />
        {/* tail */}
        <path d="M178 110 C196 108 200 92 192 84" />
      </g>
      <text x="120" y="150" textAnchor="middle" fontSize="9" fill="#9c7433" fontFamily="var(--font-tech)" letterSpacing="2">
        FIG. 1 — THE COMMON GUTTER MOUSER
      </text>
    </svg>
  );
}

export function CatSite() {
  return (
    <div className="min-h-full bg-ink-2 font-[family-name:var(--font-display)]">
      {/* site nav */}
      <header className="border-b border-line bg-panel px-6 py-4">
        <div className="text-lg font-bold tracking-[0.3em] text-gold glow">
          PURRFECT COMPANIONS
        </div>
        <div className="mt-0.5 text-[9px] tracking-[0.25em] text-gold-dim">
          THE CITY&apos;S FINEST FELINE REGISTRY · EST. 887 A.C.
        </div>
        <nav className="mt-3 flex gap-4 text-[10px] font-semibold tracking-[0.2em] text-gold-dim uppercase">
          {["Home", "Adoptions", "Care Sigils", "About"].map((item, i) => (
            <span
              key={item}
              className={`cursor-pointer hover:text-gold ${i === 0 ? "border-b border-gold text-gold" : ""}`}
            >
              {item}
            </span>
          ))}
        </nav>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-xl px-6 py-6">
        <h1 className="text-xl font-bold text-gold">Companion of the Month</h1>
        <p className="mt-1 text-xs leading-relaxed text-gold-dim">
          Meet <span className="text-gold-bright">Cinder</span> — a four-year-old gutter
          mouser rescued from the Spindle Depot rafters. Fully ward-vaccinated,
          litter-bound, and remarkably tolerant of aetheric hum.
        </p>

        <div className="hud-corners mt-4">
          <CatIllustration className="w-full" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["TEMPERAMENT", "Aloof, Bribable"],
            ["DIET", "Fish, Moths"],
            ["WARD STATUS", "Certified"],
          ].map(([k, v]) => (
            <div key={k} className="border border-line bg-panel p-2">
              <div className="text-[8px] tracking-[0.2em] text-gold-faint">{k}</div>
              <div className="mt-1 text-[11px] text-gold-dim">{v}</div>
            </div>
          ))}
        </div>

        <button className="fc-btn mt-4 w-full text-xs">Enquire About Cinder</button>

        <footer className="mt-6 border-t border-line pt-3 text-center text-[9px] tracking-[0.2em] text-gold-faint">
          PURRFECT COMPANIONS · 12 LANTERN ROW · NO REFUNDS ON CATS
        </footer>
      </main>
    </div>
  );
}
