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
  writeBatch,
} from "firebase/firestore";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { DirectoryUser, FriendRequest } from "../types";
import { useCurrentUser } from "./currentUser";
import { auth, db } from "./firebase";
import { useMyFriends } from "./friends";

/**
 * Friending is mutual and asked-for: adding someone sends them a request, and
 * only when they accept does each land in the other's friend list.
 *
 * A request lives at `friendRequests/{fromUid}_{toUid}`. The id is derived from
 * the pair rather than generated, so asking twice overwrites the first request
 * instead of stacking up a second one.
 */

const requestId = (fromUid: string, toUid: string) => `${fromUid}_${toUid}`;

function toRequest(id: string, data: Record<string, unknown>): FriendRequest {
  return {
    id,
    fromUid:      String(data.fromUid ?? ""),
    fromName:     String(data.fromName ?? ""),
    fromUsername: String(data.fromUsername ?? ""),
    toUid:        String(data.toUid ?? ""),
    createdAt:    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
  };
}

// ── Asking ─────────────────────────────────────────────────────────────────

/**
 * Sends one request. Your name and handle ride along on the document because
 * the recipient's notification needs to say who's asking, and their rules don't
 * let them read your profile row before they've accepted.
 */
export async function sendFriendRequest(
  to: DirectoryUser,
  myName: string,
  myUsername: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  if (to.uid === user.uid) return;   // you're already yourself

  await setDoc(doc(db, "friendRequests", requestId(user.uid, to.uid)), {
    fromUid:      user.uid,
    fromName:     myName || user.displayName || "",
    fromUsername: myUsername,
    toUid:        to.uid,
    createdAt:    serverTimestamp(),
  });
}

/** The same, for the handful someone picks during onboarding. */
export async function sendFriendRequests(
  people: DirectoryUser[],
  myName: string,
  myUsername: string,
): Promise<void> {
  // Sequential rather than batched: one rejected request shouldn't take the
  // rest of the list down with it.
  for (const person of people) await sendFriendRequest(person, myName, myUsername);
}

// ── Answering ──────────────────────────────────────────────────────────────

/**
 * Accepts a request. Both sides of the friendship go in one batch, so there's no
 * moment where one person has the other as a friend and it isn't returned.
 *
 * Writing into the sender's friend list is normally forbidden. The rules make a
 * single exception for exactly this: you may add yourself to someone's list
 * while their request to you is still pending.
 *
 * Which is why the request is deleted *after* the batch rather than inside it.
 * Whether a rule's `exists()` can still see a document the same batch is
 * deleting is a subtlety not worth resting the whole feature on — and the
 * failure it guards against is already handled, since a request from someone
 * who is already a friend is filtered out of the feed below.
 */
export async function acceptFriendRequest(
  request: FriendRequest,
  myName: string,
  myUsername: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const batch = writeBatch(db);

  // Them, on your list.
  batch.set(doc(db, "users", user.uid, "friends", request.fromUid), {
    uid:      request.fromUid,
    name:     request.fromName,
    username: request.fromUsername,
    addedAt:  serverTimestamp(),
  });

  // You, on theirs.
  batch.set(doc(db, "users", request.fromUid, "friends", user.uid), {
    uid:      user.uid,
    name:     myName || user.displayName || "",
    username: myUsername,
    addedAt:  serverTimestamp(),
  });

  await batch.commit();
  await deleteDoc(doc(db, "friendRequests", request.id));
}

/**
 * Turns a request down. Nothing records that it happened — the same person can
 * ask again later, which is kinder than a permanent silent block.
 */
export async function ignoreFriendRequest(request: FriendRequest): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  await deleteDoc(doc(db, "friendRequests", request.id));
}

/** Takes back a request you sent, before it's been answered. */
export async function cancelFriendRequest(toUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  await deleteDoc(doc(db, "friendRequests", requestId(user.uid, toUid)));
}

// ── Live view ──────────────────────────────────────────────────────────────

function watchRequests(
  field: "toUid" | "fromUid",
  uid: string,
  onRequests: (requests: FriendRequest[]) => void,
  onError: (err: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(db, "friendRequests"), where(field, "==", uid)),
    (snap) => {
      const requests = snap.docs.map((d) => toRequest(d.id, d.data()));
      // Newest first. Sorted here rather than with `orderBy`, which would drop
      // any request still waiting on its server timestamp.
      requests.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      onRequests(requests);
    },
    onError,
  );
}

interface FriendRequestValue {
  /** People asking to be your friend — one notification row each. */
  incoming: FriendRequest[];
  /** Uids you've asked and haven't heard back from, for the "Requested" state. */
  requestedUids: string[];
  /** Request id currently being answered, so its buttons can hold still. */
  pendingId: string;
  accept: (request: FriendRequest) => Promise<void>;
  ignore: (request: FriendRequest) => Promise<void>;
  error: string;
}

const FriendRequestContext = createContext<FriendRequestValue>({
  incoming: [], requestedUids: [], pendingId: "",
  accept: async () => {}, ignore: async () => {}, error: "",
});

/**
 * One subscription each way, shared by the notification drawer (which answers
 * requests) and the invite screen (which needs to know what's already been sent).
 */
export function FriendRequestProvider({ children }: { children: ReactNode }) {
  const { status, uid, name, handle } = useCurrentUser();
  const { friends } = useMyFriends();
  const [incoming, setIncoming]   = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing]   = useState<FriendRequest[]>([]);
  const [pendingId, setPendingId] = useState("");
  const [error, setError]         = useState("");

  useEffect(() => {
    if (status !== "signedIn" || !uid) {
      setIncoming([]);
      setOutgoing([]);
      return;
    }
    const unsubIn  = watchRequests("toUid", uid, setIncoming, () => setIncoming([]));
    const unsubOut = watchRequests("fromUid", uid, setOutgoing, () => setOutgoing([]));
    return () => { unsubIn(); unsubOut(); };
  }, [status, uid]);

  const answer = useCallback(
    async (request: FriendRequest, run: () => Promise<void>, failure: string) => {
      if (pendingId) return;
      setPendingId(request.id);
      setError("");
      try {
        await run();
        // Nothing to clear locally: the request document is gone, so the
        // snapshot that follows takes the row off the list.
      } catch {
        setError(failure);
      } finally {
        setPendingId("");
      }
    },
    [pendingId],
  );

  const accept = useCallback(
    (request: FriendRequest) =>
      answer(request, () => acceptFriendRequest(request, name, handle), "Couldn't accept that request. Try again."),
    [answer, name, handle],
  );

  const ignore = useCallback(
    (request: FriendRequest) =>
      answer(request, () => ignoreFriendRequest(request), "Couldn't dismiss that request. Try again."),
    [answer],
  );

  /**
   * Requests from people already on your friend list are dropped rather than
   * shown. Two people can ask each other at the same time, and whoever accepts
   * first can't delete the other direction's request — the rules only let you
   * touch a document you're a party to, and reading one that isn't there to
   * check would fail the whole write. So the leftover is ignored here instead.
   */
  const pending = useMemo(
    () => incoming.filter((r) => !friends.some((f) => f.uid === r.fromUid)),
    [incoming, friends],
  );

  const value = useMemo<FriendRequestValue>(() => ({
    incoming: pending,
    requestedUids: outgoing.map((r) => r.toUid),
    pendingId,
    accept,
    ignore,
    error,
  }), [pending, outgoing, pendingId, accept, ignore, error]);

  return <FriendRequestContext.Provider value={value}>{children}</FriendRequestContext.Provider>;
}

export const useFriendRequests = () => useContext(FriendRequestContext);
