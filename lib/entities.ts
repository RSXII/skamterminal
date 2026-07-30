// Read/write access to the shared "entities" collection — see lib/firebase.ts
// and lib/types.ts for why this exists and what it's shaped like.

import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Entity, EntitySection, EntityStat, MapPoint } from "@/lib/types";

function isPublic<T extends { visibility?: "public" | "private" }>(item: T) {
  return item.visibility !== "private";
}

/** Strips GM-only sections/stats — this terminal only ever shows what an in-world lookup would. */
function toPublicView(entity: Entity): Entity {
  return {
    ...entity,
    stats: entity.stats.filter(isPublic) as EntityStat[],
    sections: entity.sections.filter(isPublic) as EntitySection[],
  };
}

export async function fetchEntities(): Promise<Entity[]> {
  const snapshot = await getDocs(collection(db, "entities"));
  return snapshot.docs
    .map((d) => toPublicView({ id: d.id, ...d.data() } as Entity))
    .sort((a, b) => a.fileNo.localeCompare(b.fileNo));
}

/** Requires Firestore rules to currently allow writes on entities/* — same as the migration scripts. */
export async function updateDistrictBoundary(districtId: string, boundary: MapPoint[]): Promise<void> {
  await setDoc(doc(db, "entities", districtId), { boundary }, { merge: true });
}
