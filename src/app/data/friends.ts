import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Friend } from "../types";
import { useCurrentUser } from "./currentUser";
import { auth, db } from "./firebase";

// COINCIDENCE FEATURE -- seed data for the nearby-and-free alerts on Home.
// Restore alongside the CoincidenceAlert type and CoincidenceSection.
// export const COINCIDENCE_ALERTS: CoincidenceAlert[] = [
//   { id: 1, name: "Mia K.",  avatar: "MK", avatarColor: PEACH,    distance: "0.2 mi", status: "Free now",          location: "Blue Bottle nearby",      time: "Just now" },
//   { id: 2, name: "Cole M.", avatar: "CM", avatarColor: MINT,     distance: "0.5 mi", status: "Up for anything",   location: "Near Whole Foods",        time: "3m ago"   },
//   { id: 3, name: "Lily T.", avatar: "LT", avatarColor: SKY,      distance: "0.8 mi", status: "Free all afternoon",location: "Main Library area",        time: "8m ago"   },
// ];

/** Avatar bubbles, assigned by uid so one person keeps one colour for good. */
const FRIEND_COLORS = [SKY, MINT, CORAL, LAVENDER, PEACH, "#A5D8FF", "#FFC9DE", "#B2F5D4"];

/** Up to two letters for an avatar bubble, or "?" for a nameless row. */
export function initialsFor(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
}

/**
 * Cheap deterministic hash — enough to spread names across the palette, and
 * stable enough that someone keeps one colour from search result to friend row.
 */
export function avatarColorFor(uid: string): string {
  let sum = 0;
  for (let i = 0; i < uid.length; i++) sum = (sum + uid.charCodeAt(i)) % 4096;
  return FRIEND_COLORS[sum % FRIEND_COLORS.length];
}

function toFriend(uid: string, data: Record<string, unknown>): Friend {
  const name = String(data.name ?? "");
  return {
    uid,
    name:     name || String(data.username ?? "Someone"),
    username: String(data.username ?? ""),
    avatar:   initialsFor(name || String(data.username ?? "")),
    color:    avatarColorFor(uid),
  };
}

/**
 * Live view of the people you've added, A–Z.
 *
 * Sorted here rather than with `orderBy`: a Firestore sort silently drops any
 * document missing the field, and a friend saved before `name` existed would
 * just vanish from the list.
 */
export function watchMyFriends(
  onFriends: (friends: Friend[]) => void,
  onError: (err: unknown) => void,
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onFriends([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, "users", user.uid, "friends"),
    (snap) => {
      const friends = snap.docs.map((d) => toFriend(d.id, d.data()));
      friends.sort((a, b) => a.name.localeCompare(b.name));
      onFriends(friends);
    },
    onError,
  );
}

/** The subscription above, wired to auth so it starts and stops with a session. */
export function useMyFriends() {
  const { status } = useCurrentUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (status !== "signedIn") {
      setFriends([]);
      setLoading(status === "loading");
      return;
    }
    setLoading(true);
    return watchMyFriends(
      (found) => { setFriends(found); setError(""); setLoading(false); },
      ()      => { setError("Couldn't load your friends."); setLoading(false); },
    );
  }, [status]);

  return { friends, loading, error };
}
