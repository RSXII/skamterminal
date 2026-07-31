"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchListings, createListing } from "@/lib/data";
import { fetchEntities } from "@/lib/entities";
import { useNavigation, useAppFocus, type AppFocus } from "@/lib/navigation";
import { useSession } from "@/lib/session";
import type { Entity, Listing, ListingKind, NewListingInput } from "@/lib/types";
import { plainText } from "@/lib/text";
import { ListingArt } from "@/components/os/icons";

function formatPrice(l: Listing) {
  const n = l.price.toLocaleString("en-US");
  return l.kind === "apartment" ? `${n} gl/mo` : `${n} gl`;
}

type Filter = "all" | ListingKind;
type View = { mode: "grid" } | { mode: "detail"; id: string } | { mode: "add" };

const EMPTY_FORM: NewListingInput = {
  kind: "apartment",
  title: "",
  address: "",
  price: 0,
  beds: 1,
  baths: 1,
  sqft: 0,
  description: "",
  available: true,
};

export function RealEstateApp() {
  const { role } = useSession();
  const { navigate } = useNavigation();
  const [focus, consumeFocus] = useAppFocus<Extract<AppFocus, { app: "estates" }>>("estates");
  const [listings, setListings] = useState<Listing[]>([]);
  const [districts, setDistricts] = useState<Entity[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>({ mode: "grid" });
  const [form, setForm] = useState<NewListingInput>(EMPTY_FORM);
  const [districtChoice, setDistrictChoice] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(() => {
    void fetchListings().then(setListings);
  }, []);

  useEffect(() => {
    refresh();
    void fetchEntities().then((es) => setDistricts(es.filter((e) => e.kind === "district")));
  }, [refresh]);

  useEffect(() => {
    if (!focus) return;
    setView({ mode: "detail", id: focus.listingId });
    consumeFocus();
  }, [focus, consumeFocus]);

  const shown = listings.filter((l) => filter === "all" || l.kind === filter);
  const selected = view.mode === "detail" ? (listings.find((l) => l.id === view.id) ?? null) : null;
  const districtName = (id?: string) => (id ? plainText(districts.find((d) => d.id === id)?.name ?? "") : "");

  async function submitNewListing(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createListing({
        ...form,
        price: Number(form.price) || 0,
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        sqft: Number(form.sqft) || 0,
        districtId: districtChoice || undefined,
      });
      refresh();
      setForm(EMPTY_FORM);
      setDistrictChoice("");
      setView({ mode: "detail", id: created.id });
    } finally {
      setSaving(false);
    }
  }

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

        {view.mode === "grid" ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(["all", "house", "apartment"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
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
            {role === "admin" && (
              <button
                onClick={() => setView({ mode: "add" })}
                className="fc-btn px-3 py-1 text-[10px]"
              >
                + Add Property
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => setView({ mode: "grid" })} className="fc-btn px-3 py-1 text-[10px]">
            ‹ Back to Listings
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.mode === "grid" && (
          <div className="grid auto-rows-min grid-cols-1 gap-3 p-4 lg:grid-cols-2">
            {shown.map((l) => (
              <button
                key={l.id}
                onClick={() => setView({ mode: "detail", id: l.id })}
                className="border border-line bg-panel text-left transition-colors hover:border-line-2"
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
                    {districtName(l.districtId) || "District unassigned"} ·{" "}
                    {l.beds === 0 ? "Studio" : `${l.beds} bed`} · {l.baths} bath · {l.sqft.toLocaleString()} sqft
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
        )}

        {view.mode === "detail" && selected && (
          <div className="mx-auto max-w-2xl p-5">
            <ListingArt kind={selected.kind} className="mb-4 w-full" />
            <div className="text-xl font-bold text-gold glow">{selected.title}</div>
            <div className="mt-1 font-[family-name:var(--font-tech)] text-xs text-gold-dim">
              {selected.address}
            </div>
            <div className="mt-3 font-[family-name:var(--font-tech)] text-2xl text-gold-bright">
              {formatPrice(selected)}
            </div>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs">
              {[
                ["Type", selected.kind === "house" ? "House" : "Apartment"],
                ["District", districtName(selected.districtId) || "Unassigned"],
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
            <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-gold-dim">
              {selected.description}
            </p>
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
              <button className="fc-btn text-xs" disabled={!selected.available}>
                {selected.available ? "Enquire" : "Unavailable"}
              </button>
              <button
                className="fc-btn text-xs disabled:opacity-50"
                disabled={!selected.districtId || !selected.districtHotspot}
                title={
                  !selected.districtId || !selected.districtHotspot
                    ? "Not yet placed on the map"
                    : undefined
                }
                onClick={() => navigate({ app: "map", locationId: selected.id })}
              >
                Show on Map
              </button>
            </div>
          </div>
        )}

        {view.mode === "add" && (
          <form onSubmit={submitNewListing} className="mx-auto max-w-lg space-y-3 p-5 text-xs">
            <div className="text-[10px] tracking-[0.2em] text-gold-dim uppercase">New Property</div>

            <label className="block">
              <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="fc-input w-full"
              />
            </label>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Kind</span>
                <select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ListingKind }))}
                  className="fc-input w-full"
                >
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">District</span>
                <select
                  value={districtChoice}
                  onChange={(e) => setDistrictChoice(e.target.value)}
                  className="fc-input w-full"
                >
                  <option value="">— unassigned —</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {plainText(d.name)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Address</span>
              <input
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="fc-input w-full"
              />
            </label>

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">
                  Price ({form.kind === "apartment" ? "gl/mo" : "gl"})
                </span>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  className="fc-input w-full"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Beds</span>
                <input
                  type="number"
                  min={0}
                  value={form.beds}
                  onChange={(e) => setForm((f) => ({ ...f, beds: Number(e.target.value) }))}
                  className="fc-input w-full"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Baths</span>
                <input
                  type="number"
                  min={0}
                  value={form.baths}
                  onChange={(e) => setForm((f) => ({ ...f, baths: Number(e.target.value) }))}
                  className="fc-input w-full"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Sqft</span>
                <input
                  type="number"
                  min={0}
                  value={form.sqft}
                  onChange={(e) => setForm((f) => ({ ...f, sqft: Number(e.target.value) }))}
                  className="fc-input w-full"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-gold-faint uppercase tracking-[0.1em]">Description</span>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="fc-input h-20 w-full resize-none"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
              />
              <span className="text-gold-dim">Available</span>
            </label>

            <div className="flex gap-2 border-t border-line pt-3">
              <button type="submit" disabled={saving} className="fc-btn border-gold bg-gold/15 disabled:opacity-50">
                {saving ? "Saving…" : "Create Listing"}
              </button>
              <button type="button" onClick={() => setView({ mode: "grid" })} className="fc-btn">
                Cancel
              </button>
            </div>
            <p className="text-[10px] text-gold-faint">
              Placement on the Field Map happens after creation, from the map&apos;s edit mode.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
