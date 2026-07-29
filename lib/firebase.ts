// Shared Firebase project — single source of truth for NPC / organization /
// location data, also used by the fate-city-1999 "wire" app (see that repo's
// src/lib/firebase-db.js for the RTDB/messages side of this same project).
// Config values are the public client keys; access is governed by Firestore
// security rules, not by keeping this secret.

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

export const db = getFirestore(app);
export const storage = getStorage(app);
