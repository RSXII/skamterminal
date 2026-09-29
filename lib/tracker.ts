// Case tracker storage — the shared evidence board and task list. Lives in its own
// Firestore collections (never `entities`, see lib/entities.ts for why that one's
// write-locked) so every player's board/task edits sync live to everyone else via
// onSnapshot, the same shared project as lib/firebase.ts.

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EvidenceConnection, EvidenceNote, TrackerTask } from "@/lib/types";

const NOTES_COL = "trackerNotes";
const CONNECTIONS_COL = "trackerConnections";
const TASKS_COL = "trackerTasks";

// --- evidence notes ---

export function subscribeNotes(onChange: (notes: EvidenceNote[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(
    collection(db, NOTES_COL),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EvidenceNote)),
    onError,
  );
}

export async function createNote(text: string, x: number, y: number, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, NOTES_COL), { text, x, y, createdBy, createdAt: Date.now() });
  return ref.id;
}

export async function updateNotePosition(id: string, x: number, y: number): Promise<void> {
  await updateDoc(doc(db, NOTES_COL, id), { x, y });
}

export async function updateNoteText(id: string, text: string): Promise<void> {
  await updateDoc(doc(db, NOTES_COL, id), { text });
}

/** Deletes a note and any connections touching it. */
export async function deleteNote(id: string): Promise<void> {
  const [fromDocs, toDocs] = await Promise.all([
    getDocs(query(collection(db, CONNECTIONS_COL), where("fromId", "==", id))),
    getDocs(query(collection(db, CONNECTIONS_COL), where("toId", "==", id))),
  ]);
  await Promise.all([
    deleteDoc(doc(db, NOTES_COL, id)),
    ...fromDocs.docs.map((d) => deleteDoc(d.ref)),
    ...toDocs.docs.map((d) => deleteDoc(d.ref)),
  ]);
}

// --- connections ---

export function subscribeConnections(
  onChange: (connections: EvidenceConnection[]) => void,
  onError?: (err: Error) => void,
) {
  return onSnapshot(
    collection(db, CONNECTIONS_COL),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EvidenceConnection)),
    onError,
  );
}

export async function createConnection(fromId: string, toId: string, createdBy: string): Promise<void> {
  await addDoc(collection(db, CONNECTIONS_COL), { fromId, toId, createdBy, createdAt: Date.now() });
}

export async function deleteConnection(id: string): Promise<void> {
  await deleteDoc(doc(db, CONNECTIONS_COL, id));
}

// --- tasks ---

export function subscribeTasks(onChange: (tasks: TrackerTask[]) => void, onError?: (err: Error) => void) {
  return onSnapshot(
    collection(db, TASKS_COL),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackerTask)),
    onError,
  );
}

export async function createTask(text: string, createdBy: string): Promise<void> {
  await addDoc(collection(db, TASKS_COL), { text, createdBy, createdAt: Date.now(), votes: [] });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COL, id));
}

/** Atomic add/remove so two players voting at once can't clobber each other. Caller enforces the 2-vote cap. */
export async function setTaskVote(id: string, user: string, voted: boolean): Promise<void> {
  await updateDoc(doc(db, TASKS_COL, id), { votes: voted ? arrayUnion(user) : arrayRemove(user) });
}
