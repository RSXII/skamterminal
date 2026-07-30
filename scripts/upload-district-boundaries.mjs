#!/usr/bin/env node
// One-off: push rough district boundary polygons (traced from the user's
// reference outline image, transformed into the master map's coordinate
// space) and switch patchs/marble-bar's districtHotspot from "% of that
// district's old cropped image" to "% of the shared master canvas" — the
// city map is now one continuous zoomable SVG, not a set of separate images.
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

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

const SCRATCH = "/private/tmp/claude-501/-Users-rdschultz-github-skamterminal/95a3d010-402b-437b-9fca-e6ffd9c6129f/scratchpad";
const boundaries = JSON.parse(readFileSync(`${SCRATCH}/district-boundaries-pct.json`, "utf8"));
const locationHotspots = JSON.parse(readFileSync(`${SCRATCH}/location-hotspots-master-pct.json`, "utf8"));

for (const [districtId, boundary] of Object.entries(boundaries)) {
  await setDoc(doc(db, "entities", districtId), { boundary }, { merge: true });
  console.log(districtId, "boundary ->", boundary.length, "points");
}

for (const [locationId, point] of Object.entries(locationHotspots)) {
  await setDoc(doc(db, "entities", locationId), { districtHotspot: point }, { merge: true });
  console.log(locationId, "districtHotspot (master %) ->", point);
}

console.log("done");
process.exit(0);
