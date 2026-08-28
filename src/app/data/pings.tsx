import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { Friend, Ping } from "../types";
import { useCurrentUser } from "./currentUser";
import { auth, db } from "./firebase";

/**
 * A ping is a nudge with no payload: "I'm free, are you?". It exists because
 * there's nowhere else to say that — the app has no messaging layer, and adding
 * one would mean a server to fan messages out with.
 *
 * So a ping borrows the friend-request shape instead. It's a document at
 * `pings/{fromUid}_{toUid}`, the id derived from the pair rather than generated,
 * and the recipient's notification feed derives a row from it the same way it
 * derives one from a plan. Nothing is written to the recipient — they read a
 * document the sender created, which is the only direction the rules allow
 * without a server in the middle.
 *
 * Unlike a request there's nothing to accept, so nothing deletes it on the happy
 * path. It ages out of the feed instead, on the window below.
 */

const pingId = (fromUid: string, toUid: string) => `${fromUid}_${toUid}`;

/**
 * How long a ping stays in the recipient's feed. A nudge is about right now —
 * one from this morning is noise by the evening, and answering it with a plan
 * would be answering a question nobody is still asking.
 */
const PING_GRACE_MS = 3 * 60 * 60 * 1000;

/**
 * How long the button stays on "Pinged ✓" before offering itself again. Long
 * enough to read as confirmation, short enough that someone who genuinely wants
 * to nudge again isn't stuck looking at a dead button.
 */
const PING_SENT_MS = 60 * 1000;

function toPing(id: string, data: Record<string, unknown>): Ping {
  return {
    id,
    fromUid:      String(data.fromUid ?? ""),
    fromName:     String(data.fromName ?? ""),
    fromUsername: String(data.fromUsername ?? ""),
    toUid:        String(data.toUid ?? ""),
    createdAt:    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
  };
}

// ── Sending ────────────────────────────────────────────────────────────────

/**
 * Nudges one friend. Your name rides along on the document for the same reason
 * it does on a friend request: the recipient's notification has to say who it's
 * from, and reading your profile row to find out would be a second read on
 * every notification the feed derives.
 *
 * Pinging the same person again overwrites the first ping rather than adding a
 * second — but it does refresh `createdAt`, and the notification is keyed on
 * that, so the new one still arrives as its own unread row.
 */
export async function sendPing(
  to: Friend,
  myName: string,
  myUsername: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  if (to.uid === user.uid) return;   // you're already yourself

  await setDoc(doc(db, "pings", pingId(user.uid, to.uid)), {
    fromUid:      user.uid,
    fromName:     myName || user.displayName || "",
    fromUsername: myUsername,
    toUid:        to.uid,
    createdAt:    serverTimestamp(),
  });
}

/** Takes a ping back. Nothing in the UI calls this yet — it's here so a stale
    document has a way out that doesn't need a server to sweep it. */
export async function cancelPing(toUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  await deleteDoc(doc(db, "pings", pingId(user.uid, toUid)));
}

// ── Errors ─────────────────────────────────────────────────────────────────

/**
 * Turns a Firestore error code into something worth showing — and, for the one
 * failure that isn't the user's fault or the network's, something worth acting
 * on. `permission-denied` on a ping means the rules in `firestore.rules` aren't
 * the rules the project is running — a newly added collection stays denied
 * until they're released. `npm run deploy` carries them along with hosting;
 * `npm run deploy:rules` pushes them on their own.
 */
export function pingErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : err instanceof Error
        ? err.message
        : "";

  switch (code) {
    case "permission-denied":
      return "Ping blocked by Firestore rules. Deploy them: firebase deploy --only firestore:rules";
    case "unavailable":
    case "auth/network-request-failed":
      return "You're offline. Try that ping again in a moment.";
    case "not-signed-in":
      return "You're signed out. Sign in again to ping.";
    default:
      return "Couldn't send that ping. Try again.";
  }
}

// ── Live view ──────────────────────────────────────────────────────────────

function watchPings(
  uid: string,
  onPings: (pings: Ping[]) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "pings"), where("toUid", "==", uid)),
    (snap) => {
      const cutoff = Date.now() - PING_GRACE_MS;
      const pings = snap.docs
        .map((d) => toPing(d.id, d.data()))
        // A ping still waiting on its server timestamp is kept: it was written
        // moments ago by definition, and dropping it would make your own
        // notification flicker in a beat late.
        .filter((p) => !p.createdAt || p.createdAt.getTime() >= cutoff);

      // Newest first. Sorted here rather than with `orderBy`, which would drop
      // any ping whose timestamp hasn't resolved.
      pings.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      onPings(pings);
    },
    onError,
  );
}

interface PingValue {
  /** Pings waiting for you — one notification row each. */
  incoming: Ping[];
  /** Uids you've pinged this session, so their button can say so. */
  sentUids: string[];
  /** Uid currently being pinged, so its button can hold still. */
  pendingUid: string;
  ping: (friend: Friend) => Promise<void>;
  error: string;
}

const PingContext = createContext<PingValue>({
  incoming: [], sentUids: [], pendingUid: "",
  ping: async () => {}, error: "",
});

/**
 * One subscription for incoming pings, shared by the bell and the drawer.
 *
 * A provider rather than a plain hook for the same reason the friend requests
 * are one: `useNotifs` is called by both the header badge and the drawer, and a
 * subscription each would be two listeners on the same query.
 */
export function PingProvider({ children }: { children: ReactNode }) {
  const { status, uid, name, handle } = useCurrentUser();
  const [incoming, setIncoming]     = useState<Ping[]>([]);
  const [sentUids, setSentUids]     = useState<string[]>([]);
  const [pendingUid, setPendingUid] = useState("");
  const [error, setError]           = useState("");

  useEffect(() => {
    if (status !== "signedIn" || !uid) {
      setIncoming([]);
      setSentUids([]);
      return;
    }
    return watchPings(uid, setIncoming, () => setIncoming([]));
  }, [status, uid]);

  // One timer per uid on "Pinged ✓", cleared on unmount so a tab switch can't
  // leave a setState pointed at a provider that's gone.
  const sentTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = sentTimers.current;
    return () => { for (const t of timers.values()) clearTimeout(t); timers.clear(); };
  }, []);

  const ping = useCallback(async (friend: Friend) => {
    if (pendingUid) return;
    setPendingUid(friend.uid);
    setError("");
    try {
      await sendPing(friend, name, handle);
      // Held locally rather than read back: the ping document is addressed to
      // them, so the sender's own rules let them write it but there's no query
      // here that returns it. The button state is the only feedback there is.
      setSentUids((prev) => (prev.includes(friend.uid) ? prev : [...prev, friend.uid]));

      const timers = sentTimers.current;
      clearTimeout(timers.get(friend.uid));
      timers.set(friend.uid, setTimeout(() => {
        timers.delete(friend.uid);
        setSentUids((prev) => prev.filter((uid) => uid !== friend.uid));
      }, PING_SENT_MS));
    } catch (err) {
      setError(pingErrorMessage(err));
    } finally {
      setPendingUid("");
    }
  }, [pendingUid, name, handle]);

  const value = useMemo<PingValue>(
    () => ({ incoming, sentUids, pendingUid, ping, error }),
    [incoming, sentUids, pendingUid, ping, error],
  );

  return <PingContext.Provider value={value}>{children}</PingContext.Provider>;
}

export const usePings = () => useContext(PingContext);
