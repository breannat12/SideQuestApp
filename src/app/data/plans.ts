import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  onSnapshot,
  type FieldValue,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Attendee, NewPlan, Plan } from "../types";
import { ME } from "./currentUser";
import { auth, db } from "./firebase";
import { avatarColorFor, initialsFor } from "./friends";

// ── Saved plans ────────────────────────────────────────────────────────────

/** Turns the chosen time chip into a real moment, so plans can be ordered. */
export function startsAtFor(timeLabel: string): Date {
  const at = new Date();
  if (timeLabel.includes("30 min")) at.setMinutes(at.getMinutes() + 30);
  else if (timeLabel.includes("1 hr"))  at.setHours(at.getHours() + 1);
  else if (timeLabel.includes("2 hrs")) at.setHours(at.getHours() + 2);
  else if (timeLabel === "Tonight") {
    at.setHours(19, 0, 0, 0);
    // Picking "Tonight" after 7pm means the coming evening, not one gone by.
    if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
  } else if (timeLabel === "Tomorrow") {
    at.setDate(at.getDate() + 1);
    at.setHours(12, 0, 0, 0);
  }
  return at;
}

/** A time picked by hand on the Create tab. */
export type ClockTime = { hour: number; minute: number; meridiem: "AM" | "PM" };

/** 1–12 + AM/PM as the 0–23 hour a Date wants. */
function hour24({ hour, meridiem }: ClockTime): number {
  if (meridiem === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

/**
 * The next occurrence of a hand-picked clock time. A time that's already gone
 * by today means tomorrow — nobody schedules a plan into the past.
 */
export function startsAtForClock(t: ClockTime): Date {
  const at = new Date();
  at.setHours(hour24(t), t.minute, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return at;
}

/** "8:05 PM", or "Tomorrow 8:05 AM" once the time has passed for today. */
export function clockLabel(t: ClockTime): string {
  const time = `${t.hour}:${String(t.minute).padStart(2, "0")} ${t.meridiem}`;
  return isToday(startsAtForClock(t)) ? time : `Tomorrow ${time}`;
}

export const isToday = (date?: Date): boolean =>
  !date || date.toDateString() === new Date().toDateString();

/** The card's time chip: "Now" while it's happening, a clock time today, a day after. */
function formatWhen(startsAt: Date): string {
  const minsAway = (startsAt.getTime() - Date.now()) / 60000;
  if (minsAway <= 5 && minsAway >= -30) return "Now";

  if (isToday(startsAt)) {
    return startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const day  = startsAt.toLocaleDateString([], { weekday: "short" });
  const hour = startsAt.toLocaleTimeString([], { hour: "numeric" });
  return `${day} ${hour}`;
}

/**
 * Saves a plan you created and addresses it to `audienceUids` — the friends who
 * will see it on Explore, get a notification for it, and be allowed to join.
 *
 * The audience is stamped on at creation rather than resolved at read time:
 * Firestore can't join a plan against someone else's private friend list, and
 * freezing it means a friend added tomorrow doesn't retroactively appear on a
 * plan that already happened.
 *
 * You go straight onto the roster as its first attendee, so hosting and joining
 * read back through one query on Home.
 */
export async function createPlan(
  plan: NewPlan,
  hostName: string,
  audienceUids: string[],
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const name = hostName || user.displayName || "";
  // Your own uid would let you match your own audience query and see the plan
  // twice — once as host, once as a friend's.
  const audience = [...new Set(audienceUids.filter((uid) => uid && uid !== user.uid))];

  await addDoc(collection(db, "plans"), {
    hostUid:   user.uid,
    hostName:  name,
    title:     plan.title,
    emoji:     plan.emoji,
    color:     plan.color,
    timeLabel: plan.timeLabel,
    startsAt:  Timestamp.fromDate(plan.startsAt),
    location:  plan.location,
    // Firestore rejects an undefined value outright, so coordinates are spread
    // in only when the location actually came with them.
    ...(typeof plan.lat === "number" && typeof plan.lng === "number"
      ? { lat: plan.lat, lng: plan.lng }
      : {}),
    group:     plan.group,
    flexTime:  plan.flexTime,
    flexLoc:   plan.flexLoc,
    audienceUids:  audience,
    attendeeUids:  [user.uid],
    attendeeNames: { [user.uid]: name },
    // A client clock, not `serverTimestamp()`: the sentinel isn't allowed inside
    // a map value, and this only ever drives a "4m ago" label.
    joinedAt:      { [user.uid]: Timestamp.now() },
    createdAt: serverTimestamp(),
  });
}

// ── Joining ────────────────────────────────────────────────────────────────

/**
 * Adds you to a plan someone else is hosting. Writes all three attendee fields
 * together — the security rules only accept a change that touches exactly these
 * and moves your own uid in or out, so a join can't edit anything else.
 */
export async function joinPlan(planId: string, myName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await updateDoc(doc(db, "plans", planId), {
    attendeeUids: arrayUnion(user.uid),
    [`attendeeNames.${user.uid}`]: myName || user.displayName || "",
    [`joinedAt.${user.uid}`]:      Timestamp.now(),
  });
}

/**
 * Calls a plan off. Marked rather than deleted, and that's the whole trick:
 * notifications in this app are derived from documents that exist, so deleting
 * the plan would take the "it's cancelled" message down with it. The flag lets
 * the plan disappear from every Home and Explore tab while still carrying word
 * of its own cancellation to the people who were invited.
 *
 * It ages out on its own — `watchFriendPlans` drops anything well past its
 * start time, so a cancelled plan stops being mentioned once it's moot.
 */
export async function cancelPlan(planId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await updateDoc(doc(db, "plans", planId), {
    cancelled:   true,
    cancelledAt: serverTimestamp(),
  });
}

/** Backs you out again. The host can't leave their own plan — see the rules. */
export async function leavePlan(planId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await updateDoc(doc(db, "plans", planId), {
    attendeeUids: arrayRemove(user.uid),
    [`attendeeNames.${user.uid}`]: deleteField(),
    [`joinedAt.${user.uid}`]:      deleteField(),
  });
}

/**
 * The location label for a plan pinned to wherever its host happened to be.
 * Shared with the create flow so the two can't drift — the check below is a
 * string comparison, and a reworded label would silently stop matching.
 */
export const CURRENT_LOCATION = "Current Location";

/**
 * The place line on a plan card: "Blue Bottle, Hayes Valley · 0.3 mi".
 *
 * The distance is dropped for a plan set to the host's current location. That
 * label describes where *they* were, so pairing it with how far *you* are from
 * it reads as a measurement of nothing.
 */
export function locationLine(plan: Plan): string {
  if (!plan.distance || plan.location === CURRENT_LOCATION) return plan.location;
  return `${plan.location} · ${plan.distance}`;
}

/** What the edit sheet is allowed to change on a plan you host. */
export interface PlanEdit {
  timeLabel?: string;
  startsAt?: Date;
  location?: string;
}

/**
 * Moves a plan you host. Only time and place: everything else about a plan is
 * settled once it's out, and the rules only let its host through anyway.
 */
export async function updatePlan(id: string, edit: PlanEdit): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const patch: Record<string, string | Timestamp | FieldValue> = { updatedAt: serverTimestamp() };
  if (edit.timeLabel !== undefined) patch.timeLabel = edit.timeLabel;
  if (edit.startsAt  !== undefined) patch.startsAt  = Timestamp.fromDate(edit.startsAt);
  if (edit.location  !== undefined) patch.location  = edit.location;

  await updateDoc(doc(db, "plans", id), patch);
}

/**
 * How long a plan stays in a friend's Explore feed after its start time. Long
 * enough that "Coffee at 3" is still joinable at 3:20, short enough that
 * yesterday's plans don't pile up in a feed nobody can act on.
 */
const FEED_GRACE_MS = 3 * 60 * 60 * 1000;

const bySoonest = (a: Plan, b: Plan) =>
  (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0);

/** The shape of the snapshots the watchers below feed to `fill`. */
type PlanSnapshot = { docs: { id: string; data: () => Record<string, unknown> }[] };

/**
 * Live view of the plans on your Home tab, soonest first: the ones you host and
 * the ones you've joined.
 *
 * Two subscriptions rather than one query on `attendeeUids`, because plans
 * written before the roster existed have no such field and would drop off Home
 * the day this shipped. Each snapshot owns its own map, so a document leaving
 * one query can't delete a copy the other still holds.
 *
 * Sorted here rather than in the query on purpose: pairing `where` with an
 * `orderBy` on a different field needs a composite index, and a plan list this
 * size doesn't justify making someone go and create one.
 */
export function watchMyPlans(
  onPlans: (plans: Plan[]) => void,
  onError: (err: unknown) => void,
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onPlans([]);
    return () => {};
  }
  const uid = user.uid;

  const hosted = new Map<string, Plan>();
  const joined = new Map<string, Plan>();
  let hostedReady = false;
  let joinedReady = false;

  // Held until both have reported once, so Home doesn't paint your hosted plans
  // and then visibly grow a moment later as the joined ones land.
  const emit = () => {
    if (!hostedReady || !joinedReady) return;
    const merged = new Map([...hosted, ...joined]);
    onPlans([...merged.values()].sort(bySoonest));
  };

  const fill = (map: Map<string, Plan>, snap: PlanSnapshot) => {
    map.clear();
    for (const d of snap.docs) map.set(d.id, toPlan(d.id, d.data(), uid));
  };

  const unsubHosted = onSnapshot(
    query(collection(db, "plans"), where("hostUid", "==", uid)),
    (snap) => { fill(hosted, snap); hostedReady = true; emit(); },
    onError,
  );

  const unsubJoined = onSnapshot(
    query(collection(db, "plans"), where("attendeeUids", "array-contains", uid)),
    (snap) => { fill(joined, snap); joinedReady = true; emit(); },
    onError,
  );

  return () => { unsubHosted(); unsubJoined(); };
}

/**
 * Live view of the plans your friends addressed to you — what Explore offers to
 * join, and what the notification drawer is built from.
 *
 * Plans well past their start time are dropped: this feed is for things you can
 * still turn up to.
 */
export function watchFriendPlans(
  onPlans: (plans: Plan[]) => void,
  onError: (err: unknown) => void,
): () => void {
  const user = auth.currentUser;
  if (!user) {
    onPlans([]);
    return () => {};
  }
  const uid = user.uid;

  return onSnapshot(
    query(collection(db, "plans"), where("audienceUids", "array-contains", uid)),
    (snap) => {
      const plans = snap.docs
        .map((d) => toPlan(d.id, d.data(), uid))
        .filter((p) => p.hostUid !== uid)
        .filter((p) => (p.startsAt?.getTime() ?? 0) > Date.now() - FEED_GRACE_MS);
      plans.sort(bySoonest);
      onPlans(plans);
    },
    onError,
  );
}

const asMap = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Everyone on a plan, host first, from the three parallel attendee fields. */
function toRoster(data: Record<string, unknown>, hostUid: string): Attendee[] {
  const uids = Array.isArray(data.attendeeUids)
    ? data.attendeeUids.map(String)
    // A plan saved before the roster existed still has exactly one person on it.
    : hostUid ? [hostUid] : [];

  const names    = asMap(data.attendeeNames);
  const times    = asMap(data.joinedAt);
  const hostName = String(data.hostName ?? "");

  return uids
    .map((uid) => {
      const at = times[uid];
      return {
        uid,
        name:     String(names[uid] ?? (uid === hostUid ? hostName : "")),
        joinedAt: at instanceof Timestamp ? at.toDate() : undefined,
      };
    })
    .sort((a, b) => {
      if (a.uid === hostUid) return -1;   // the host always leads the row
      if (b.uid === hostUid) return 1;
      return (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0);
    });
}

function toPlan(id: string, data: Record<string, unknown>, myUid: string): Plan {
  const color    = String(data.color ?? SKY);
  const startsAt = data.startsAt instanceof Timestamp ? data.startsAt.toDate() : new Date();
  const hostUid  = String(data.hostUid ?? "");
  const hostName = String(data.hostName ?? "");
  const mine     = hostUid === myUid;
  const roster   = toRoster(data, hostUid);

  return {
    id,
    emoji:       String(data.emoji ?? "👥"),
    activity:    String(data.title ?? "Untitled plan"),
    host:        mine ? "You" : hostName || "Someone",
    // `ME` is swapped for your own initials at render time, which lets a seeded
    // plan and a real one share one avatar component.
    avatar:      mine ? ME : initialsFor(hostName),
    avatarColor: mine ? color : avatarColorFor(hostUid),
    accentColor: color,
    time:        formatWhen(startsAt),
    startsAt,
    location:    String(data.location ?? ""),
    group:       String(data.group ?? "Everyone"),
    description: "",
    attendees:   roster.length,
    attendeeAvatars: roster.map((a) => ({
      initials: a.uid === myUid ? ME : initialsFor(a.name),
      color:    a.uid === myUid ? color : avatarColorFor(a.uid),
    })),
    flexTime:    Boolean(data.flexTime),
    flexLoc:     Boolean(data.flexLoc),
    // Distance is left to the caller: it needs the viewer's own position, which
    // this module has no business resolving on every snapshot.
    lat:         typeof data.lat === "number" ? data.lat : undefined,
    lng:         typeof data.lng === "number" ? data.lng : undefined,
    hostUid,
    cancelled:   Boolean(data.cancelled),
    cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt.toDate() : undefined,
    createdAt:   data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    audienceUids: Array.isArray(data.audienceUids) ? data.audienceUids.map(String) : [],
    roster,
  };
}

/** Turns a Firestore failure into something worth putting in front of someone. */
export function planErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : err instanceof Error ? err.message : "";

  switch (code) {
    case "permission-denied":
      return "Couldn't save the plan. Check your Firestore rules.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    case "not-signed-in":
      return "You're signed out. Log back in to share a plan.";
    default:
      return "Couldn't share the plan. Please try again.";
  }
}

// ── Seeded demo data ───────────────────────────────────────────────────────
// Explore reads real plans from Firestore now, so there's no seeded feed left.
// What's below is unused, and stays only for the shelved Home variant in
// HomeTab.withCoincidenceAlerts.tsx, which still refers to it in comments.

// ── My Plans (created or RSVP'd by you) ──────────────────────────────────
export const MY_PLANS_TODAY: Plan[] = [
  {
    id: "101", emoji: "☕", activity: "Coffee Run", host: "You", avatar: ME, avatarColor: SKY,
    time: "Now", distance: "0.3 mi", attendees: 3, accentColor: SKY,
    location: "Blue Bottle, Hayes Valley", group: "College",
    description: "Grabbing a quick coffee before afternoon classes.",
    attendeeAvatars: [{ initials: ME, color: SKY }, { initials: "MK", color: PEACH }, { initials: "LT", color: MINT }],
  },
  {
    id: "102", emoji: "📚", activity: "Study Session", host: "Lily T.", avatar: "LT", avatarColor: SKY,
    time: "2:00 PM", distance: "1.1 mi", attendees: 3, accentColor: SKY,
    location: "Main Library, 4th floor", group: "College",
    description: "Finals prep — bringing snacks. Quiet study vibes only.",
    attendeeAvatars: [{ initials: "LT", color: SKY }, { initials: ME, color: SKY }, { initials: "SP", color: LAVENDER }],
  },
  {
    id: "103", emoji: "🏋️", activity: "Gym Sesh", host: "You", avatar: ME, avatarColor: MINT,
    time: "5:00 PM", distance: "0.8 mi", attendees: 2, accentColor: MINT,
    location: "Planet Fitness, Market St", group: "Roommates",
    description: "Leg day — looking for a spotter.",
    attendeeAvatars: [{ initials: ME, color: MINT }, { initials: "CM", color: MINT }],
  },
];

export const MY_PLANS_LATER: Plan[] = [
  {
    id: "104", emoji: "🎮", activity: "Gaming Night", host: "Zoe L.", avatar: "ZL", avatarColor: LAVENDER,
    time: "Sat 8 PM", distance: "1.4 mi", attendees: 5, accentColor: LAVENDER,
    location: "Zoe's Apartment, Mission", group: "College",
    description: "Mario Kart tournament. Bring controllers & snacks.",
    attendeeAvatars: [{ initials: "ZL", color: LAVENDER }, { initials: ME, color: SKY }, { initials: "MK", color: PEACH }],
  },
  {
    id: "105", emoji: "🎬", activity: "Movie Night", host: "Sam P.", avatar: "SP", avatarColor: "#A5D8FF",
    time: "Sun 7 PM", distance: "1.0 mi", attendees: 4, accentColor: "#A5D8FF",
    location: "AMC Metreon 16", group: "Friends",
    description: "New Villeneuve film. Pre-buying tickets — confirm ASAP!",
    attendeeAvatars: [{ initials: "SP", color: "#A5D8FF" }, { initials: ME, color: SKY }, { initials: "YO", color: MINT }],
  },
];
