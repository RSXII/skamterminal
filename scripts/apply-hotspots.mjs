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

// Positions read off the district-label centers on fate_city_gps.png.
const CITY_HOTSPOTS = {
  "district-weston-heights": { x: 20.6, y: 7.9 },
  "district-warehouse-district": { x: 15.0, y: 18.0 },
  "district-city-heights": { x: 56.9, y: 7.8 },
  "district-downtown": { x: 48.0, y: 19.6 },
  "district-sunny-estates": { x: 80.2, y: 22.9 },
  "district-weston": { x: 19.1, y: 31.5 },
  "district-sebring": { x: 39.0, y: 43.7 },
  "district-crescent-hills": { x: 64.7, y: 49.7 },
  "district-fcr-square": { x: 76.4, y: 36.8 },
  "district-fulfillment-center": { x: 66.6, y: 26.8 },
  "district-cooper-city": { x: 40.8, y: 63.9 },
  "district-industrial-square": { x: 55.6, y: 63.9 },
  "district-broad-heights": { x: 85.5, y: 61.3 },
  "district-briarwood": { x: 61.8, y: 72.4 },
  "district-ellis": { x: 55.6, y: 88.6 },
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
