#!/usr/bin/env node
// ── Apply map hotspot coordinates to existing entity docs ───────────────────
//
// A separate, iterative pass from the content migrations — hotspots get
// refined over time (by hand here, or via the terminal's "Place Pins" edit
// mode) without needing to re-run the full district/location migration.
//
// Usage:
//   node scripts/apply-hotspots.mjs             # live run
//   node scripts/apply-hotspots.mjs --dry-run   # preview only, no writes

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const DRY_RUN = process.argv.includes("--dry-run");

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA7OmVO18bOequMLYUieWGhVabB4_vTlOs",
  authDomain: "cpr-wire-device.firebaseapp.com",
  databaseURL: "https://cpr-wire-device-default-rtdb.firebaseio.com",
  projectId: "cpr-wire-device",
  storageBucket: "cpr-wire-device.firebasestorage.app",
  messagingSenderId: "435892659027",
  appId: "1:435892659027:web:dbdffda17e128484a437a6",
};

const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// Positions read directly off the font_district <text> labels in the vector
// city map (Fate City.svg) — exact, not eyeballed: (x - viewBoxX) / viewBoxW.
const CITY_HOTSPOTS = {
  "district-weston-heights": { x: 17.6, y: 22.5 },
  "district-warehouse-district": { x: 13.8, y: 27.8 },
  "district-city-heights": { x: 49.9, y: 21.5 },
  "district-downtown": { x: 45.0, y: 29.5 },
  "district-sunny-estates": { x: 67.1, y: 29.5 },
  "district-weston": { x: 15.5, y: 38.8 },
  "district-sebring": { x: 37.5, y: 46.8 },
  "district-crescent-hills": { x: 56.8, y: 53.8 },
  "district-fcr-square": { x: 66.6, y: 39.1 },
  "district-fulfillment-center": { x: 58.9, y: 34.8 },
  "district-cooper-city": { x: 39.6, y: 63.5 },
  "district-industrial-square": { x: 49.3, y: 63.5 },
  "district-broad-heights": { x: 72.8, y: 62.1 },
  "district-briarwood": { x: 58.7, y: 73.5 },
  "district-ellis": { x: 47.1, y: 83.8 },
};

// Positions read off the matching label on each district's own detail map.
// Only locations with a clearly matching label get a pin — the rest stay
// reachable through the district's location list until their map catches up.
const DISTRICT_HOTSPOTS = {
  patchs: { x: 26.5, y: 23.6 }, // "Patch's" on briarwood_gps.png
  "marble-bar": { x: 60.8, y: 38.7 }, // "Marble" on fcr_square_gps.png
};

async function main() {
  if (DRY_RUN) console.log("── DRY RUN — nothing will be written ──\n");

  console.log("City hotspots:");
  for (const [id, point] of Object.entries(CITY_HOTSPOTS)) {
    console.log(`  ${id}  →  ${point.x}%, ${point.y}%`);
    if (!DRY_RUN) await setDoc(doc(db, "entities", id), { cityHotspot: point }, { merge: true });
  }

  console.log("\nDistrict hotspots:");
  for (const [id, point] of Object.entries(DISTRICT_HOTSPOTS)) {
    console.log(`  ${id}  →  ${point.x}%, ${point.y}%`);
    if (!DRY_RUN) await setDoc(doc(db, "entities", id), { districtHotspot: point }, { merge: true });
  }

  console.log(DRY_RUN ? "\nDry run done." : "\nHotspots applied.");
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFailed:", e);
  process.exit(1);
});
