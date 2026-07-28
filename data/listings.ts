import type { Listing } from "@/lib/types";

// Placeholder listings for Gilded Key Realty. Later this moves behind
// lib/data.ts into Firestore / Realtime Database.
export const LISTINGS: Listing[] = [
  {
    id: "lantern-row-4c",
    kind: "apartment",
    title: "Corner Flat over the Lampworks",
    address: "Apt 4C, 22 Lantern Row",
    district: "Lantern Row",
    price: 1450,
    beds: 1,
    baths: 1,
    sqft: 620,
    description:
      "One-bedroom flat above a working lampworks. South-facing windows, aether heating included. Expect a warm amber glow at all hours.",
    available: true,
  },
  {
    id: "wyrmshadow-19",
    kind: "house",
    title: "Restored Rowhouse on Wyrmshadow",
    address: "19 Wyrmshadow Lane",
    district: "Coppergate",
    price: 385000,
    beds: 3,
    baths: 2,
    sqft: 1980,
    description:
      "Three-story rowhouse with original brass fittings and a warded cellar. Walking distance to the Coppergate tram line.",
    available: false,
  },
  {
    id: "spindle-loft-9",
    kind: "apartment",
    title: "Depot Loft, Unit 9",
    address: "Unit 9, Spindle Depot Annex",
    district: "The Spindle",
    price: 900,
    beds: 0,
    baths: 1,
    sqft: 480,
    description:
      "Open loft in the converted depot annex. Freight lift access, reinforced floor. Popular with couriers and night workers.",
    available: true,
  },
  {
    id: "emberfell-7",
    kind: "house",
    title: "Emberfell Court Detached",
    address: "7 Emberfell Court",
    district: "Emberfell",
    price: 512000,
    beds: 4,
    baths: 3,
    sqft: 2600,
    description:
      "Detached family home on a quiet warded court. Private garden, double hearth, and a view of the S.K.AM tower spire.",
    available: false,
  },
  {
    id: "vessel-vine-2b",
    kind: "apartment",
    title: "Canalside Two-Bedroom",
    address: "Apt 2B, 5 Vessel & Vine Walk",
    district: "Vessel & Vine",
    price: 2100,
    beds: 2,
    baths: 1,
    sqft: 840,
    description:
      "Two-bedroom over the canal walk. Evening market noise until the tenth bell. Landlord asks no questions about visitors.",
    available: true,
  },
  {
    id: "coppergate-tower-31",
    kind: "apartment",
    title: "Tower Suite 31",
    address: "Suite 31, Coppergate Tower",
    district: "Coppergate",
    price: 3800,
    beds: 2,
    baths: 2,
    sqft: 1150,
    description:
      "High-floor suite with warded glass and private lift key. Building staff are discreet and well compensated for it.",
    available: true,
  },
];
