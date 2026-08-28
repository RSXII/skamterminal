// Gilded Key listing storage — kept behind this interface so the backing
// store can move to Firestore later (once the shared `entities` collection's
// write lock reopens, see lib/entities.ts) without touching any component.

import { LISTINGS } from "@/data/listings";
import type { Listing, MapPoint, NewListingInput } from "@/lib/types";

export interface ListingsStore {
  list(): Promise<Listing[]>;
  create(input: NewListingInput): Promise<Listing>;
  placeOnMap(id: string, districtId: string, point: MapPoint): Promise<Listing>;
}

const STORAGE_KEY = "fcos.listings.v1";

function readAll(): Listing[] {
  if (typeof window === "undefined") return LISTINGS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LISTINGS));
    return LISTINGS;
  }
  try {
    return JSON.parse(raw) as Listing[];
  } catch {
    return LISTINGS;
  }
}

function writeAll(listings: Listing[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
}

function makeId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "listing"}-${Math.random().toString(36).slice(2, 7)}`;
}

function createLocalStorageListingsStore(): ListingsStore {
  return {
    async list() {
      return readAll();
    },
    async create(input) {
      const listing: Listing = { ...input, id: makeId(input.title) };
      writeAll([...readAll(), listing]);
      return listing;
    },
    async placeOnMap(id, districtId, point) {
      const listings = readAll();
      const next = listings.map((l) => (l.id === id ? { ...l, districtId, districtHotspot: point } : l));
      const updated = next.find((l) => l.id === id);
      if (!updated) throw new Error(`Unknown listing: ${id}`);
      writeAll(next);
      return updated;
    },
  };
}

export const listingsStore: ListingsStore = createLocalStorageListingsStore();
