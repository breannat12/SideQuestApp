import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { FriendRequest, Notif, Plan } from "../types";
import { useCurrentUser } from "./currentUser";
import { useFriendRequests } from "./friendRequests";
import { usePlanFeed } from "./planFeed";

/**
 * Notifications aren't stored. They're derived from the queries the app already
 * runs — plans and friend requests — which is why a friend sharing a plan lights
 * up your bell within the same snapshot that puts it on your Explore tab.
 *
 * The alternative — a `notifications` document written per recipient — needs a
 * fan-out on the server, and Cloud Functions mean a billing account. Deriving
 * costs nothing and can't drift out of sync with the plans it describes.
 *
 * What that trades away: nothing is remembered once a plan leaves the feed, and
 * read receipts live in this browser rather than on the account.
 */

/** Only the last of these are kept, so a long-lived account can't fill storage. */
const READ_HISTORY_MAX = 300;

const readKey = (uid: string) => `sidequest:notifsRead:${uid}`;

function loadRead(uid: string): Set<string> {
  if (!uid) return new Set();
  try {
    const raw = localStorage.getItem(readKey(uid));
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    // Private-mode Safari and a corrupt entry both land here. An unread badge is
    // a better failure than a crash on open.
    return new Set();
  }
}

function saveRead(uid: string, ids: Set<string>): void {
  if (!uid) return;
  try {
    localStorage.setItem(readKey(uid), JSON.stringify([...ids].slice(-READ_HISTORY_MAX)));
  } catch {
    // Out of quota, or storage disabled. The badge resets next reload; that's all.
  }
}

// ── Read receipts, shared across every caller ──────────────────────────────
// One module-level store rather than state inside the hook: the bell in the
// header and the drawer itself both call `useNotifs`, and with a copy each,
// the drawer marking everything read would leave the badge still lit.

let readIds: ReadonlySet<string> = new Set<string>();
let loadedUid = "";
const listeners = new Set<() => void>();

const announce = () => { for (const listen of listeners) listen(); };

const subscribeToReads = (listen: () => void) => {
  listeners.add(listen);
  return () => { listeners.delete(listen); };
};

/** Stable between changes, which is what `useSyncExternalStore` requires. */
const readSnapshot = () => readIds;

/**
 * Swaps in the receipts for whoever is signed in. Idempotent, because every
 * mounted `useNotifs` runs it — signing in as someone else must not carry the
 * last person's receipts over, or their notifications arrive pre-dismissed.
 */
function loadReadFor(uid: string): void {
  if (uid === loadedUid) return;
  loadedUid = uid;
  readIds = loadRead(uid);
  announce();
}

function markRead(ids: string[]): void {
  const fresh = ids.filter((id) => !readIds.has(id));
  // Bailing when there's nothing new is what stops the drawer's mark-on-open
  // effect from re-firing itself: no new set, no re-render, no second pass.
  if (fresh.length === 0) return;

  const next = new Set(readIds);
  for (const id of fresh) next.add(id);
  readIds = next;
  saveRead(loadedUid, next);
  announce();
}

/** "Mia K." → "Mia". Notification copy reads better on first names alone. */
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || "Someone";

/** A short, human gap. Anything older than a week isn't in the feed anyway. */
export function timeAgo(at: Date): string {
  const mins = Math.floor((Date.now() - at.getTime()) / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/** "☕ Coffee Run · 3:00 PM · Blue Bottle" — the details, minus the headline. */
const planLine = (plan: Plan) =>
  [`${plan.emoji} ${plan.activity}`, plan.time, plan.location].filter(Boolean).join(" · ");

/**
 * Turns the live lists into a newest-first feed: one row per friend request
 * waiting on you, one per plan a friend sent you, and one per person who joined
 * something you host.
 */
export function buildNotifs(
  myPlans: Plan[],
  friendPlans: Plan[],
  requests: FriendRequest[],
  myUid: string,
): Notif[] {
  const out: Notif[] = [];

  for (const request of requests) {
    const who = request.fromName || (request.fromUsername ? `@${request.fromUsername}` : "Someone");
    out.push({
      id:      `request:${request.id}`,
      type:    "request",
      title:   `${who} wants to be friends`,
      body:    request.fromUsername ? `@${request.fromUsername}` : "Tap accept to add them back.",
      at:      request.createdAt ?? new Date(),
      request,
      read:    false,
    });
  }

  for (const plan of friendPlans) {
    out.push({
      id:     `plan:${plan.id}`,
      type:   "plan",
      title:  `New plan from ${firstNameOf(plan.host)}`,
      body:   planLine(plan),
      // A plan still settling has no server timestamp yet; its start time keeps
      // it in roughly the right place until the write comes back.
      at:     plan.createdAt ?? plan.startsAt ?? new Date(),
      planId: plan.id,
      read:   false,
    });
  }

  for (const plan of myPlans) {
    if (!plan.hostUid || plan.hostUid !== myUid) continue;   // only plans you host
    for (const guest of plan.roster ?? []) {
      if (guest.uid === myUid) continue;                     // you're always on it
      out.push({
        id:     `join:${plan.id}:${guest.uid}`,
        type:   "join",
        title:  `${firstNameOf(guest.name)} joined your plan`,
        body:   `${guest.name || "Someone"} is in for ${plan.activity} · ${plan.time}`,
        at:     guest.joinedAt ?? plan.createdAt ?? new Date(),
        planId: plan.id,
        read:   false,
      });
    }
  }

  // Requests first whatever their age: they're the only rows that need an
  // answer, and one from yesterday still outranks a plan from this morning.
  return out.sort((a, b) => {
    const byKind = Number(b.type === "request") - Number(a.type === "request");
    return byKind || b.at.getTime() - a.at.getTime();
  });
}

/**
 * The notification feed, with read state. Opening the drawer marks everything
 * currently in it as read — there's nothing to tap through to yet, so a per-row
 * receipt would only be a second thing to get wrong.
 */
export function useNotifs() {
  const { uid } = useCurrentUser();
  const { myPlans, friendPlans } = usePlanFeed();
  const { incoming } = useFriendRequests();
  const read = useSyncExternalStore(subscribeToReads, readSnapshot);

  useEffect(() => { loadReadFor(uid); }, [uid]);

  const notifs = useMemo(
    () => buildNotifs(myPlans, friendPlans, incoming, uid).map((n) => ({ ...n, read: read.has(n.id) })),
    [myPlans, friendPlans, incoming, uid, read],
  );

  const unread = notifs.reduce((count, n) => count + (n.read ? 0 : 1), 0);

  const markAllRead = useCallback(() => { markRead(notifs.map((n) => n.id)); }, [notifs]);

  return { notifs, unread, markAllRead };
}
