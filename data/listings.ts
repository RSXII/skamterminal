import type { Listing } from "@/lib/types";

// Seed data for Gilded Key Realty. Read/written through lib/listings-store.ts
// (currently localStorage — see that file for why), not used directly.
export const LISTINGS: Listing[] = [
  {
    id: "lantern-row-4c",
    kind: "apartment",
    title: "Corner Flat over the Lampworks",
    address: "Apt 4C, 22 Lantern Row",
    price: 1450,
    beds: 1,
    baths: 1,
    sqft: 620,
    description:
      "One-bedroom flat above a working lampworks. South-facing windows, aether heating included. Expect a warm amber glow at all hours.",
    available: true,
    districtId: "district-downtown",
    districtHotspot: { x: 46, y: 29 },
  },
];
