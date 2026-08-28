// GM "send location" nav signal — see lib/firebase.ts for why this lives on
// the Realtime Database instead of Firestore. `nav/current` is a single
// mutable node, not a growing log: the GM overwrites it each time they send
// a new destination, and every connected client just diffs `requestedAt`
// against whatever it last acted on.

import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { EntityKind } from "@/lib/types";

export interface NavSignal {
  targetId: string;
  /** Only "district" | "location" ever get sent, but read defensively. */
  targetKind: EntityKind;
  /** Parent district id — equal to targetId for a district target. */
  districtId: string;
  label: string;
  /** ms epoch; the de-dupe token every subscriber diffs against. */
  requestedAt: number;
}

/** Fires with the current nav/current value on subscribe and on every change; `null` if nothing's ever been sent. */
export function subscribeNav(callback: (signal: NavSignal | null) => void): () => void {
  return onValue(ref(rtdb, "nav/current"), (snapshot) => {
    callback(snapshot.val());
  });
}
