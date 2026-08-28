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
  // A person/org's home/HQ pin is GM-only knowledge until the party finds it in fiction —
  // same treatment as a private stat/section, so it's withheld here rather than gated by role.
  const hideLocation =
    (entity.kind === "person" || entity.kind === "organization") && !entity.locationRevealed;
  return {
    ...entity,
    stats: entity.stats.filter(isPublic) as EntityStat[],
    sections: entity.sections.filter(isPublic) as EntitySection[],
    district: hideLocation ? undefined : entity.district,
    districtHotspot: hideLocation ? undefined : entity.districtHotspot,
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

/**
 * Writes wherever the Field Map's placement tool just dropped a pin — a district's city-level
 * fallback point, a location's pin within its (already-assigned) district, or a person/org's
 * home/HQ pin plus which district it's in. Same write-through pattern as updateDistrictBoundary,
 * and the same caveat: requires Firestore rules to currently allow writes on entities/*.
 */
export async function updateEntityLocation(
  entityId: string,
  fields: Partial<Pick<Entity, "cityHotspot" | "district" | "districtHotspot">>,
): Promise<void> {
  await setDoc(doc(db, "entities", entityId), fields, { merge: true });
}
