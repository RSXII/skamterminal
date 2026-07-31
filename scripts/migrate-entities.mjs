#!/usr/bin/env node
// ── One-time migration: fate-city-1999 persons.js → shared Firestore ────────
//
// Reads the NPCS array straight out of the sibling fate-city-1999 repo
// (../fate-city-1999/src/lib/data/persons.js), uploads each referenced
// profile image to the shared project's Firebase Storage bucket, and writes
// one doc per entity into the "entities" collection. This is the seed for
// the single shared NPC/organization dataset — see lib/types.ts for the
// schema and lib/entities.ts for how skamterminal reads it back.
//
// fate-city-1999 itself is NOT modified — it keeps reading its own static
// persons.js until a separate follow-up points it at this same collection.
//
// Usage:
//   node scripts/migrate-entities.mjs             # live run
//   node scripts/migrate-entities.mjs --dry-run   # preview only, no writes
//
// Safe to re-run: stable doc IDs mean existing Firestore docs and Storage
// objects are overwritten rather than duplicated.

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { readFileSync, existsSync } from "node:fs";
import { extname, basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DRY_RUN = process.argv.includes("--dry-run");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIRE_REPO = resolve(__dirname, "..", "..", "fate-city-1999");
const PERSONS_JS = resolve(WIRE_REPO, "src/lib/data/persons.js");
const IMAGES_DIR = resolve(WIRE_REPO, "static");

if (!existsSync(PERSONS_JS)) {
  console.error(`Can't find ${PERSONS_JS}\nExpected fate-city-1999 checked out as a sibling of skamterminal.`);
  process.exit(1);
}

const { NPCS } = await import(PERSONS_JS);

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

const CONTENT_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

const uploadCache = new Map(); // relative "images/x.png" -> download URL

async function uploadImage(relPath, entityId) {
  if (uploadCache.has(relPath)) return uploadCache.get(relPath);

  const localPath = resolve(IMAGES_DIR, relPath);
  if (!existsSync(localPath)) {
    console.warn(`  ⚠  missing image file, skipping: ${relPath}`);
    return null;
  }

  const fileName = basename(relPath);
  const storagePath = `entities/${entityId}/${fileName}`;

  if (DRY_RUN) {
    console.log(`    (dry run) would upload ${relPath} → ${storagePath}`);
    const fakeUrl = `dry-run://${storagePath}`;
    uploadCache.set(relPath, fakeUrl);
    return fakeUrl;
  }

  const bytes = readFileSync(localPath);
  const contentType = CONTENT_TYPES[extname(fileName).toLowerCase()] ?? "application/octet-stream";
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, bytes, { contentType });
  const url = await getDownloadURL(storageRef);
  uploadCache.set(relPath, url);
  return url;
}

// Strip undefined/null before writing.
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function migrateSection(section, entityId) {
  const isBenefactorHooks = section.heading === "A Note From Your Benefactor";
  // The mysterious-benefactor entity's own "Overview" is a placeholder for a
  // password-gated puzzle that's specific to the wire app's UI — not general
  // dossier content, so it stays private here too.
  const isRedactedPlaceholder = entityId === "benefactor" && section.heading === "Overview";

  return clean({
    heading: section.heading,
    paragraphs: section.paragraphs,
    hooks: section.hooks,
    visibility: isBenefactorHooks || isRedactedPlaceholder ? "private" : undefined,
  });
}

// "_01" is the actual representative shot for a person — "_profile" is
// usually a cropped/placeholder version. Lead the gallery with "_01" when
// one exists; otherwise fall back to whatever's first in the source data.
function leadWithMainImage(relPaths) {
  const idx = relPaths.findIndex((p) => /_01\.(png|jpg|jpeg)$/i.test(p));
  if (idx <= 0) return relPaths;
  const reordered = [...relPaths];
  const [main] = reordered.splice(idx, 1);
  reordered.unshift(main);
  return reordered;
}

async function migrateEntity(npc) {
  const images = [];
  for (const relPath of leadWithMainImage(npc.images ?? [])) {
    const url = await uploadImage(relPath, npc.id);
    if (url) images.push(url);
  }

  return clean({
    id: npc.id,
    kind: npc.category,
    fileNo: npc.fileNo,
    stamp: npc.stamp,
    colors: npc.colors,
    name: npc.name,
    epithet: npc.epithet,
    images,
    stats: (npc.stats ?? []).map((s) => clean({ label: s.label, value: s.value })),
    sections: (npc.sections ?? []).map((s) => migrateSection(s, npc.id)),
    quote: npc.quote ?? null,
    // Home (person) / HQ (organization) pin — same district + districtHotspot shape as a
    // location entity, plus locationRevealed to gate it from players until discovered in
    // fiction (see toPublicView() in lib/entities.ts). All optional: unset until placed via
    // the Field Map's edit mode (staged JSON) or by hand here in the source NPC data.
    district: npc.district ?? undefined,
    districtHotspot: npc.districtHotspot ?? undefined,
    locationRevealed: npc.locationRevealed ?? undefined,
  });
}

async function main() {
  if (DRY_RUN) console.log("── DRY RUN — nothing will be written ──\n");

  console.log(`Migrating ${NPCS.length} entities from ${PERSONS_JS}\n`);

  let count = 0;
  for (const npc of NPCS) {
    const entity = await migrateEntity(npc);
    console.log(`  ${entity.id}  [${entity.kind}]  ${entity.name}  (${entity.images.length} image(s))`);

    if (!DRY_RUN) {
      await setDoc(doc(db, "entities", entity.id), entity);
    }
    count++;
  }

  console.log(
    DRY_RUN
      ? `\nDry run done — ${count} entities previewed. Re-run without --dry-run to write.`
      : `\nMigration complete — ${count} entities written to Firestore + Storage.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("\nMigration failed:", e);
  process.exit(1);
});
