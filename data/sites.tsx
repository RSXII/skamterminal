import type { FakeSite } from "@/lib/types";
import { CatSite } from "@/components/apps/sites/CatSite";
import { RealEstateApp } from "@/components/apps/RealEstateApp";

// Fake websites reachable from the in-OS browser. To add a site:
// build a component under components/apps/sites/ and register it here
// with every URL that should resolve to it.
export const SITES: FakeSite[] = [
  {
    id: "purrfect",
    urls: ["purrfect.aet", "www.purrfect.aet", "purrfect.com", "www.purrfect.com"],
    title: "Purrfect Companions",
    component: CatSite,
  },
  {
    id: "gildedkey",
    urls: ["gildedkey.aet", "www.gildedkey.aet", "gildedkey.com", "www.gildedkey.com"],
    title: "Gilded Key Realty",
    component: RealEstateApp,
  },
];

/** Normalize whatever the user typed into a comparable hostname/path. */
export function normalizeUrl(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/\/+$/, "");
}

export function resolveSite(input: string): FakeSite | null {
  const normalized = normalizeUrl(input);
  return SITES.find((s) => s.urls.includes(normalized)) ?? null;
}

/** True when the input looks like a real external URL we can try to iframe. */
export function isExternalUrl(input: string): boolean {
  const n = normalizeUrl(input);
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+/.test(n);
}
