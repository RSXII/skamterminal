import type { ComponentType } from "react";

export interface NPC {
  id: string;
  name: string;
  age: number;
  gender: string;
  occupation: string;
  workplace: string;
  /** Displayed as "UNKNOWN" until homeKnown is true. */
  home: string;
  homeKnown: boolean;
  /** Short dossier blurb. */
  summary: string;
  /** Hue used to tint the generated portrait, keeps NPCs distinguishable. */
  portraitSeed: number;
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
}
