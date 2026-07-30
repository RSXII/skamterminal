#!/usr/bin/env node
// ── Reorder already-migrated `images` arrays so "_01" leads, not "_profile" ──
//
// Patches existing entity docs in place — no re-upload, just a field update.
// See migrate-entities.mjs's leadWithMainImage() for the same rule applied
// to future migrations.
//
// Usage:
//   node scripts/fix-image-order.mjs             # live run
//   node scripts/fix-image-order.mjs --dry-run   # preview only, no writes

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

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

function leadWithMainImage(images) {
  const idx = images.findIndex((url) => /_01\.(png|jpg|jpeg)(\?|$)/i.test(url));
  if (idx <= 0) return images;
  const reordered = [...images];
  const [main] = reordered.splice(idx, 1);
  reordered.unshift(main);
  return reordered;
}

async function main() {
  if (DRY_RUN) console.log("── DRY RUN — nothing will be written ──\n");

  const snapshot = await getDocs(collection(db, "entities"));
  let changed = 0;

  for (const d of snapshot.docs) {
    const data = d.data();
    const images = data.images ?? [];
    const reordered = leadWithMainImage(images);
    if (reordered[0] === images[0]) continue;

    console.log(`  ${d.id}: main image → ${reordered[0].split("/").pop().split("?")[0]}`);
    changed++;
    if (!DRY_RUN) await setDoc(doc(db, "entities", d.id), { images: reordered }, { merge: true });
  }

  console.log(
    DRY_RUN
      ? `\nDry run done — ${changed} entities would change. Re-run without --dry-run to write.`
      : `\n${changed} entities updated.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("\nFailed:", e);
  process.exit(1);
});
