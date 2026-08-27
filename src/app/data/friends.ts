import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Friend, FriendStatus } from "../types";
import { useCurrentUser } from "./currentUser";
import { auth, db } from "./firebase";
import { STATUS_DEFAULT, readStatus } from "./users";

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

// ── Who's free right now ───────────────────────────────────────────────────
//
// Availability lives on `users/{uid}`, not on the friend row. It has to: the
// friend document is written once, when the friendship is accepted, and neither
// party may write to the other's copy afterwards — so a cached status there
// would freeze at whatever it was the day you met.
//
// Reading it back is allowed because `users/{uid}` is readable by any signed-in
// user, which is the same permission the handle search runs on.

/**
 * Firestore's ceiling for an `in` filter. Friend lists longer than this are
 * split across several subscriptions, one per chunk.
 */
const STATUS_CHUNK = 30;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Live availability for a set of uids, as `{ uid: status }`.
 *
 * One query per chunk of 30 rather than one listener per friend: a 25-friend
 * list is a single subscription this way and 25 of them the other. Each chunk
 * owns its own map and they're merged on every snapshot, the same way the two
 * plan queries are — so a slow chunk can't blank out the rows another already
 * reported.
 */
export function watchFriendStatuses(
  uids: string[],
  onStatuses: (statuses: Record<string, FriendStatus>) => void,
  onError: (err: unknown) => void,
): () => void {
  if (uids.length === 0) {
    onStatuses({});
    return () => {};
  }

  const chunks = chunk(uids, STATUS_CHUNK);
  const perChunk: Record<string, FriendStatus>[] = chunks.map(() => ({}));

  const publish = () => onStatuses(Object.assign({}, ...perChunk));

  const unsubs = chunks.map((ids, i) =>
    onSnapshot(
      query(collection(db, "users"), where(documentId(), "in", ids)),
      (snap) => {
        const next: Record<string, FriendStatus> = {};
        for (const d of snap.docs) next[d.id] = readStatus(d.data().status);
        perChunk[i] = next;
        publish();
      },
      onError,
    ),
  );

  return () => { for (const stop of unsubs) stop(); };
}

/**
 * The subscription above, keyed on the friend list it was given. A friend who
 * has never set a status — or whose row failed to load — reads as available,
 * which is the same default their own Profile tab shows them.
 */
export function useFriendStatuses(friends: Friend[]): Record<string, FriendStatus> {
  const [statuses, setStatuses] = useState<Record<string, FriendStatus>>({});

  // Friends arrive as a fresh array on every snapshot, so the effect keys off
  // the uids themselves — otherwise it would tear down and rebuild every
  // listener each time an unrelated field on any friend changed.
  const key = useMemo(() => friends.map((f) => f.uid).sort().join(","), [friends]);

  useEffect(() => {
    const uids = key ? key.split(",") : [];
    return watchFriendStatuses(uids, setStatuses, () => setStatuses({}));
  }, [key]);

  return statuses;
}

/** Availability for one friend, defaulting the same way the profile row does. */
export const statusOf = (
  statuses: Record<string, FriendStatus>,
  uid: string,
): FriendStatus => statuses[uid] ?? STATUS_DEFAULT;
