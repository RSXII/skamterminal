#!/usr/bin/env node
// One-off: upload the recolored vector city map and point city-overview at it.
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

const bytes = readFileSync(
  "/private/tmp/claude-501/-Users-rdschultz-github-skamterminal/95a3d010-402b-437b-9fca-e6ffd9c6129f/scratchpad/fate-city-styled.svg"
);
const storageRef = ref(storage, "maps/fate-city-styled.svg");
await uploadBytes(storageRef, bytes, { contentType: "image/svg+xml" });
const url = await getDownloadURL(storageRef);
console.log("uploaded:", url);

await setDoc(doc(db, "entities", "city-overview"), { mapImageUrl: url }, { merge: true });
console.log("city-overview.mapImageUrl updated");
process.exit(0);
