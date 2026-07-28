// FCOS data layer.
//
// Every read goes through the async functions below so the backing store
// can be swapped for Firestore / Realtime Database / Vercel KV later
// without touching any app component. For now: static data + localStorage.

import { NPCS } from "@/data/npcs";
import { LISTINGS } from "@/data/listings";
import type { Listing, NPC } from "@/lib/types";

export async function fetchNPCs(): Promise<NPC[]> {
  return NPCS;
}

export async function fetchListings(): Promise<Listing[]> {
  return LISTINGS;
}

// --- per-NPC player notes (localStorage) ---

const NOTES_PREFIX = "fcos.notes.";

export function loadNotes(npcId: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NOTES_PREFIX + npcId) ?? "";
}

export function saveNotes(npcId: string, text: string) {
  if (typeof window === "undefined") return;
  if (text.trim() === "") {
    window.localStorage.removeItem(NOTES_PREFIX + npcId);
  } else {
    window.localStorage.setItem(NOTES_PREFIX + npcId, text);
  }
}

// --- session / boot flags ---

const BOOTED_KEY = "fcos.hasBooted";
const LAST_USER_KEY = "fcos.lastUser";

export function hasBootedBefore(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BOOTED_KEY) === "1";
}

export function markBooted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BOOTED_KEY, "1");
}

export function getLastUser(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_USER_KEY) ?? "";
}

export function setLastUser(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_USER_KEY, name);
}
