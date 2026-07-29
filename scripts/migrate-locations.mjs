#!/usr/bin/env node
// ── One-time migration: fate-city-1999 locations.js → shared Firestore ──────
//
// Reads DISTRICTS + LOCATIONS out of the sibling fate-city-1999 repo and
// writes one entity doc per district/location into the same "entities"
// collection the people/orgs migration uses (see migrate-entities.mjs).
// Also uploads the hand-drawn map images from ./scratch-maps/ to Storage and
// attaches them as mapImageUrl on the districts that have one, plus on the
// existing "city-overview" briefing entity for the city-wide map.
//
// This does NOT set cityHotspot/districtHotspot — pin placement is a
// separate, iterative pass done from the terminal's map edit mode.
//
// Usage:
//   node scripts/migrate-locations.mjs             # live run
//   node scripts/migrate-locations.mjs --dry-run   # preview only, no writes

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DRY_RUN = process.argv.includes("--dry-run");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIRE_REPO = resolve(__dirname, "..", "..", "fate-city-1999");
const LOCATIONS_JS = resolve(WIRE_REPO, "src/lib/data/locations.js");
const SCRATCH_MAPS = resolve(__dirname, "..", "scratch-maps");

if (!existsSync(LOCATIONS_JS)) {
  console.error(`Can't find ${LOCATIONS_JS}\nExpected fate-city-1999 checked out as a sibling of skamterminal.`);
  process.exit(1);
}

const { DISTRICTS, LOCATIONS } = await import(LOCATIONS_JS);

// Only these districts have hand-drawn detail maps so far.
const DISTRICT_MAPS = {
  "district-briarwood": "briarwood_gps.png",
  "district-broad-heights": "broad_heights_gps.png",
  "district-crescent-hills": "crescent_hills_gps.png",
  "district-ellis": "ellis_gps.png",
  "district-fcr-square": "fcr_square_gps.png",
};
const CITY_MAP_FILE = "fate_city_gps.png";
const CITY_ENTITY_ID = "city-overview";

// LOCATIONS.district is a free-text label in the source data — map it to the
// matching district entity id.
const DISTRICT_NAME_TO_ID = {
  Briarwood: "district-briarwood",
  Downtown: "district-downtown",
  "FCR Square": "district-fcr-square",
};
function resolveDistrictId(label) {
  for (const [name, id] of Object.entries(DISTRICT_NAME_TO_ID)) {
    if (label.startsWith(name)) return id;
  }
  console.warn(`  ⚠  unrecognized district label "${label}" — leaving unset`);
  return undefined;
}

// ── Firebase (mirrors lib/firebase.ts) ───────────────────────────────────────
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
const storage = getStorage(app);

async function uploadMap(fileName) {
  const localPath = resolve(SCRATCH_MAPS, fileName);
  if (!existsSync(localPath)) {
    console.warn(`  ⚠  missing map file, skipping: ${fileName}`);
    return null;
  }
  const storagePath = `maps/${fileName}`;
  if (DRY_RUN) {
    console.log(`  (dry run) would upload ${fileName} → ${storagePath}`);
    return `dry-run://${storagePath}`;
  }
  const bytes = readFileSync(localPath);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, bytes, { contentType: "image/png" });
  return getDownloadURL(storageRef);
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function migrateSection(section) {
  const isBenefactorHooks = section.heading === "A Note From Your Benefactor";
  return clean({
    heading: section.heading,
    paragraphs: section.paragraphs,
    hooks: section.hooks,
    visibility: isBenefactorHooks ? "private" : undefined,
  });
}

function migrateDistrict(district, mapUrl) {
  return clean({
    id: district.id,
    kind: "district",
    fileNo: district.fileNo,
    stamp: district.stamp,
    colors: district.colors,
    name: district.name,
    epithet: district.epithet,
    images: district.images ?? [],
    stats: (district.stats ?? []).map((s) => clean({ label: s.label, value: s.value })),
    sections: (district.sections ?? []).map(migrateSection),
    quote: district.quote ?? null,
    mapImageUrl: mapUrl ?? undefined,
  });
}

function migrateLocation(location) {
  return clean({
    id: location.id,
    kind: "location",
    fileNo: location.fileNo,
    stamp: location.stamp,
    colors: location.colors,
    name: location.name,
    epithet: location.epithet,
    images: location.images ?? [],
    stats: (location.stats ?? []).map((s) => clean({ label: s.label, value: s.value })),
    sections: (location.sections ?? []).map(migrateSection),
    quote: location.quote ?? null,
    district: resolveDistrictId(location.district),
  });
}

async function main() {
  if (DRY_RUN) console.log("── DRY RUN — nothing will be written ──\n");

  console.log(`Migrating ${DISTRICTS.length} districts + ${LOCATIONS.length} locations from ${LOCATIONS_JS}\n`);

  console.log("Districts:");
  for (const district of DISTRICTS) {
    const mapFile = DISTRICT_MAPS[district.id];
    const mapUrl = mapFile ? await uploadMap(mapFile) : null;
    const entity = migrateDistrict(district, mapUrl);
    console.log(`  ${entity.id}  ${entity.name}${mapUrl ? "  [has map]" : ""}`);
    if (!DRY_RUN) await setDoc(doc(db, "entities", entity.id), entity);
  }

  console.log("\nLocations:");
  for (const location of LOCATIONS) {
    const entity = migrateLocation(location);
    console.log(`  ${entity.id}  ${entity.name}  (district: ${entity.district ?? "none"})`);
    if (!DRY_RUN) await setDoc(doc(db, "entities", entity.id), entity);
  }

  console.log("\nCity map:");
  const cityMapUrl = await uploadMap(CITY_MAP_FILE);
  if (cityMapUrl) {
    console.log(`  attaching to ${CITY_ENTITY_ID}`);
    if (!DRY_RUN) {
      const cityDoc = await getDoc(doc(db, "entities", CITY_ENTITY_ID));
      if (!cityDoc.exists()) {
        console.warn(`  ⚠  ${CITY_ENTITY_ID} doesn't exist yet — run migrate-entities.mjs first`);
      } else {
        await setDoc(doc(db, "entities", CITY_ENTITY_ID), { mapImageUrl: cityMapUrl }, { merge: true });
      }
    }
  }

  console.log(
    DRY_RUN
      ? "\nDry run done. Re-run without --dry-run to write."
      : "\nMigration complete — districts, locations, and map images written."
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("\nMigration failed:", e);
  process.exit(1);
});
