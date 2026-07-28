"use client";

import { useEffect, useState } from "react";
import { fetchListings } from "@/lib/data";
import type { Listing, ListingKind } from "@/lib/types";
import { ListingArt, SkamSigil } from "@/components/os/icons";

function formatPrice(l: Listing) {
  const n = l.price.toLocaleString("en-US");
  return l.kind === "apartment" ? `${n} gl/mo` : `${n} gl`;
}

type Filter = "all" | ListingKind;

export function RealEstateApp() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Listing | null>(null);

  useEffect(() => {
    void fetchListings().then(setListings);
  }, []);

  const shown = listings.filter((l) => filter === "all" || l.kind === filter);

  return (
    <div className="flex h-full flex-col bg-ink-2 font-[family-name:var(--font-display)]">
      {/* site header */}
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 28 28" className="h-7 w-7 text-gold" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="6" />
            <path d="M14.5 14.5 L24 24 M20 20 l3-3 M17 17 l2.5-2.5" />
          </svg>
          <div>
            <div className="text-base font-bold tracking-[0.25em] text-gold glow">
              GILDED KEY REALTY
            </div>
            <div className="text-[9px] tracking-[0.25em] text-gold-dim">
              FINE PROPERTIES OF THE UPPER &amp; LOWER CITY
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {(["all", "house", "apartment"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setSelected(null);
              }}
              className={`border px-3 py-1 text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors ${
                filter === f
                  ? "border-gold-dim bg-panel-2 text-gold"
                  : "border-line text-gold-faint hover:text-gold-dim"
              }`}
            >
              {f === "all" ? "All" : f === "house" ? "Houses" : "Apartments"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* listing grid */}
        <div className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          {shown.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className={`border text-left transition-colors ${
                selected?.id === l.id
                  ? "border-gold-dim bg-panel-2 panel-glow"
                  : "border-line bg-panel hover:border-line-2"
              }`}
            >
              <ListingArt kind={l.kind} className="w-full" />
              <div className="p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-bold text-gold">{l.title}</div>
                  <div className="shrink-0 font-[family-name:var(--font-tech)] text-xs text-gold-bright">
                    {formatPrice(l)}
                  </div>
                </div>
                <div className="mt-0.5 text-[11px] text-gold-dim">
                  {l.district} · {l.beds === 0 ? "Studio" : `${l.beds} bed`} · {l.baths} bath ·{" "}
                  {l.sqft.toLocaleString()} sqft
                </div>
                <div
                  className={`mt-1.5 inline-block border px-1.5 py-0.5 text-[9px] tracking-[0.15em] uppercase ${
                    l.available
                      ? "border-gold-faint text-gold-dim"
                      : "border-danger/40 text-danger/80"
                  }`}
                >
                  {l.available ? "Available" : "Let Agreed"}
                </div>
              </div>
            </button>
          ))}
          {shown.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-gold-faint">
              No properties match this filter.
            </div>
          )}
        </div>

        {/* detail panel */}
        <aside className="hidden w-72 shrink-0 border-l border-line bg-panel/60 md:block">
          {selected ? (
            <div className="flex h-full flex-col overflow-y-auto p-4">
              <ListingArt kind={selected.kind} className="mb-3 w-full" />
              <div className="text-base font-bold text-gold glow">{selected.title}</div>
              <div className="mt-1 font-[family-name:var(--font-tech)] text-xs text-gold-dim">
                {selected.address}
              </div>
              <div className="mt-3 font-[family-name:var(--font-tech)] text-lg text-gold-bright">
                {formatPrice(selected)}
              </div>
              <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                {[
                  ["Type", selected.kind === "house" ? "House" : "Apartment"],
                  ["District", selected.district],
                  ["Bedrooms", selected.beds === 0 ? "Studio" : String(selected.beds)],
                  ["Baths", String(selected.baths)],
                  ["Area", `${selected.sqft.toLocaleString()} sqft`],
                  ["Status", selected.available ? "Available" : "Let Agreed"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="tracking-[0.15em] text-gold-faint uppercase">{k}</dt>
                    <dd className="text-gold-dim">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-gold-dim">
                {selected.description}
              </p>
              <button className="fc-btn mt-4 text-xs" disabled={!selected.available}>
                {selected.available ? "Enquire" : "Unavailable"}
              </button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <SkamSigil className="h-10 w-10 opacity-30" />
              <div className="text-[10px] tracking-[0.2em] text-gold-faint">
                SELECT A PROPERTY
                <br />
                TO VIEW DETAILS
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
