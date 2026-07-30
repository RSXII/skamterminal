import type { ComponentType } from "react";

// ── Shared entity schema ─────────────────────────────────────────────────
//
// This is the canonical shape for people, organizations, and (eventually)
// locations across every Fate City app — this terminal, the wire app, and
// whatever GM tooling comes next. It's stored once, in the shared Firebase
// project's "entities" collection (see lib/firebase.ts), so a field edited
// in one place shows up everywhere that reads it.
//
// Visibility is per-section / per-stat, not per-app: "private" means GM-only
// material (hooks meant for the benefactor to feed a player out of fiction,
// not something an in-world computer would ever surface) and is filtered
// out before this terminal renders anything. Omit visibility, or set it to
// "public", for content any in-world lookup could plausibly show.

export type EntityKind = "briefing" | "person" | "organization" | "district" | "location";
export type Visibility = "public" | "private";

export interface EntityColors {
  rule: string;
  accent: string;
  stripe: string;
  stampColor: string;
}

export interface EntityStat {
  label: string;
  value: string;
  visibility?: Visibility;
}

export interface EntitySection {
  heading: string;
  paragraphs?: string[];
  hooks?: string[];
  visibility?: Visibility;
}

export interface EntityQuote {
  text: string;
  cite: string;
}

/** A point on a map image, as a percentage of its width/height — resolution-independent. */
export interface MapPoint {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  kind: EntityKind;
  fileNo: string;
  stamp: string;
  colors: EntityColors;
  name: string;
  epithet: string;
  /** Download URLs from Firebase Storage — first image is the profile shot. */
  images: string[];
  stats: EntityStat[];
  sections: EntitySection[];
  quote: EntityQuote | null;

  // ── Map fields (districts + locations only) ──────────────────────────────
  // The city map is one continuous vector canvas — every point below is a
  // percentage of that same shared viewBox, not of a separate cropped image.
  // Districts zoom the canvas in rather than swapping to a different map.
  /** City entity only: the base overview raster covering the whole shared canvas. */
  mapImageUrl?: string;
  /**
   * City entity only: 2x-detail raster tiles for the four quadrants of the shared canvas
   * (each covering half its width/height), loaded in only once the player zooms in close
   * enough to be looking at that quadrant — see TILE_ZOOM_THRESHOLD in MapApp.tsx.
   */
  mapTiles?: { nw: string; ne: string; sw: string; se: string };
  /** Districts only: rough boundary polygon, for the hover-glow outline and the zoom-to-fit target. */
  boundary?: MapPoint[];
  /** Districts only: fallback point (e.g. polygon centroid) for districts without a boundary yet. */
  cityHotspot?: MapPoint;
  /** Locations only: id of the parent district entity. */
  district?: string;
  /** Locations only: where this location's pin sits on the shared city canvas. */
  districtHotspot?: MapPoint;
}

export type ListingKind = "house" | "apartment";

export interface Listing {
  id: string;
  kind: ListingKind;
  title: string;
  address: string;
  district: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  available: boolean;
}

/** A fake website reachable from the in-OS browser. */
export interface FakeSite {
  id: string;
  /** URLs (hostnames/paths, no protocol) that resolve to this site. */
  urls: string[];
  title: string;
  component: ComponentType;
}

/** An installable FCOS application. Add new apps in lib/apps.tsx. */
export interface AppDefinition {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  component: ComponentType;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
}

export interface WindowState {
  id: number;
  appId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  /** True while filling the desktop — x/y/w/h are kept as the size to restore to. */
  maximized: boolean;
}
