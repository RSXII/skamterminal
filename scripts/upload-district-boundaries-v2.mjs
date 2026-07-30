#!/usr/bin/env node
// Replace the rough hand-traced boundaries with precise contours extracted
// from the reference outline image via color-threshold masking + connected-
// component region isolation + cv2 contour tracing (see scratchpad scripts).
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
const boundaries = JSON.parse(readFileSync(`${SCRATCH}/district-boundaries-FINAL.json`, "utf8"));

for (const [districtId, boundary] of Object.entries(boundaries)) {
  await setDoc(doc(db, "entities", districtId), { boundary }, { merge: true });
  console.log(districtId, "boundary ->", boundary.length, "points");
}
console.log("done");
process.exit(0);
