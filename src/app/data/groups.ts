import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Group, NewGroup } from "../types";
import { useCurrentUser } from "./currentUser";
import { auth, db } from "./firebase";

export const GROUP_EMOJIS = [
  "🎓", "🏠", "❤️", "🎭", "⚽", "🎸", "🍕", "🌿",
  "🎮", "☕", "🏋️", "✈️", "🎬", "📚", "🐶", "🌊",
];
export const GROUP_COLORS = [SKY, MINT, CORAL, LAVENDER, PEACH, "#FFC9DE", "#A5D8FF", "#B2F5D4"];

/** Long enough to say "Tuesday climbing crew", short enough to fit a chip. */
export const GROUP_NAME_MAX = 24;

function toGroup(id: string, data: Record<string, unknown>): Group {
  return {
    id,
    name:  String(data.name ?? "Untitled group"),
    emoji: String(data.emoji ?? GROUP_EMOJIS[0]),
    color: String(data.color ?? SKY),
    // Members are friend uids; a name would go stale the moment one changed.
    memberUids: Array.isArray(data.memberUids) ? data.memberUids.map(String) : [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
  };
}

/**
 * Live view of the groups you've made, oldest first so the grid doesn't
 * reshuffle itself every time you add someone to one.
 */
export function watchMyGroups(
  onGroups: (groups: Group[]) => void,
  onError: (err: unknown) => void,
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onGroups([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, "users", user.uid, "groups"),
    (snap) => {
      const groups = snap.docs.map((d) => toGroup(d.id, d.data()));
      // A group created seconds ago has no server timestamp yet; sorting those
      // last keeps a new group from jumping around as the write settles.
      groups.sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity));
      onGroups(groups);
    },
    onError,
  );
}

/** The subscription above, wired to auth so it starts and stops with a session. */
export function useMyGroups() {
  const { status } = useCurrentUser();
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (status !== "signedIn") {
      setGroups([]);
      setLoading(status === "loading");
      return;
    }
    setLoading(true);
    return watchMyGroups(
      (found) => { setGroups(found); setError(""); setLoading(false); },
      ()      => { setError("Couldn't load your groups."); setLoading(false); },
    );
  }, [status]);

  return { groups, loading, error };
}

/** Groups are yours alone for now, so they live under your own document. */
export async function createGroup(group: NewGroup): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await addDoc(collection(db, "users", user.uid, "groups"), {
    name:       group.name,
    emoji:      group.emoji,
    color:      group.color,
    memberUids: group.memberUids,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  });
}

export async function updateGroup(id: string, group: NewGroup): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await updateDoc(doc(db, "users", user.uid, "groups", id), {
    name:       group.name,
    emoji:      group.emoji,
    color:      group.color,
    memberUids: group.memberUids,
    updatedAt:  serverTimestamp(),
  });
}

export async function deleteGroup(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  await deleteDoc(doc(db, "users", user.uid, "groups", id));
}

/** Turns a Firestore error into something worth showing above the form. */
export function groupErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : err instanceof Error ? err.message : "";

  switch (code) {
    case "permission-denied":
      return "Couldn't save the group. Check your Firestore rules.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    case "not-signed-in":
      return "You're signed out. Log back in to save a group.";
    default:
      return "Couldn't save the group. Please try again.";
  }
}
