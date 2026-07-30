#!/usr/bin/env node
// One-off: upload per-district viewBox crops of the recolored vector map,
// point each district's mapImageUrl at its own crop, and refresh the two
// location districtHotspots whose anchor buildings exist in the vector
// source (772 Briarwood Center for Patch's, Fate City Records for Marble).
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
const storage = getStorage(app);

const SCRATCH = "/private/tmp/claude-501/-Users-rdschultz-github-skamterminal/95a3d010-402b-437b-9fca-e6ffd9c6129f/scratchpad";
const crops = JSON.parse(readFileSync(`${SCRATCH}/district-crops.json`, "utf8"));
const hotspots = JSON.parse(readFileSync(`${SCRATCH}/district-hotspots.json`, "utf8"));

for (const districtId of Object.keys(crops)) {
  const bytes = readFileSync(`${SCRATCH}/district-maps/${districtId}.svg`);
  const storageRef = ref(storage, `maps/${districtId}.svg`);
  await uploadBytes(storageRef, bytes, { contentType: "image/svg+xml" });
  const url = await getDownloadURL(storageRef);
  await setDoc(doc(db, "entities", districtId), { mapImageUrl: url }, { merge: true });
  console.log(districtId, "->", url);
}

for (const [locationId, point] of Object.entries(hotspots)) {
  await setDoc(doc(db, "entities", locationId), { districtHotspot: point }, { merge: true });
  console.log(locationId, "districtHotspot ->", point);
}

console.log("done");
process.exit(0);
