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
import type { Attendee, NewPlan, Plan, Suggestion } from "../types";
import { ME } from "./currentUser";
import { auth, db } from "./firebase";
import { avatarColorFor, initialsFor } from "./friends";

// ── Saved plans ────────────────────────────────────────────────────────────

/**
 * The quick moves, in one place so the create, edit and suggest flows can't
 * drift apart. Anything beyond an hour out is what the wheel picker is for.
 */
export const QUICK_TIMES: readonly string[] = ["Now", "In 30 min", "In 1 hr"];

/**
 * Turns the chosen time chip into a real moment, so plans can be ordered.
 *
 * Three chips and the wheel picker, nothing else: "Tonight" and "Tomorrow" are
 * guesses at an hour the person never actually chose, and anything further out
 * than an hour is better picked exactly than approximated by a chip.
 */
export function startsAtFor(timeLabel: string): Date {
  const at = new Date();
  if (timeLabel.includes("30 min"))     at.setMinutes(at.getMinutes() + 30);
  else if (timeLabel.includes("1 hr"))  at.setHours(at.getHours() + 1);
  return at;   // "Now", and anything unrecognised, starts now
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

  // Minutes are kept on both branches. A plan set for 9:40 that rolls to
  // tomorrow used to read "Sat 9 AM" — the same rounding that would have people
  // turning up forty minutes early.
  const time = startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isToday(startsAt)) return time;
  return `${startsAt.toLocaleDateString([], { weekday: "short" })} ${time}`;
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

/** "Mia K." → "Mia", for the fallback label below. */
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || "Someone";

/**
 * What to call a plan's location.
 *
 * A plan pinned "here" normally stores a real place name — its host's position
 * is resolved to one at share time, see `describeCoords`. This covers the plans
 * where that couldn't happen: ones shared before it existed, and ones shared
 * with the lookup unavailable. They still carry the placeholder, which names
 * somewhere only to the person who picked it, so for anyone else it's named
 * after its host instead.
 */
export function locationLabel(plan: Plan): string {
  if (plan.location !== CURRENT_LOCATION) return plan.location;
  return plan.host === "You" ? CURRENT_LOCATION : `${firstNameOf(plan.host)}'s location`;
}

/**
 * The place line on a plan card: "Blue Bottle, Hayes Valley · 0.3 mi".
 *
 * The distance is dropped only on your own plan pinned to where you are —
 * how far you are from yourself isn't a measurement. On someone else's it
 * holds even when the name didn't resolve, because the coordinates behind it
 * are their real position.
 */
export function locationLine(plan: Plan): string {
  const label = locationLabel(plan);
  const mine  = plan.location === CURRENT_LOCATION && plan.host === "You";
  if (!plan.distance || mine) return label;
  return `${label} · ${plan.distance}`;
}

/** What the edit sheet is allowed to change on a plan you host. */
export interface PlanEdit {
  timeLabel?: string;
  startsAt?: Date;
  location?: string;
  /**
   * Where the new place is. `null` clears them: a location typed by hand has no
   * coordinates, and leaving the last place's behind would have every card
   * measuring the distance to somewhere the plan no longer is.
   */
  lat?: number | null;
  lng?: number | null;
}

/** Which half of a plan its host last moved. Drives the "New time…" notification. */
export type PlanEditKind = "time" | "location" | "both";

export const isPlanEditKind = (value: unknown): value is PlanEditKind =>
  value === "time" || value === "location" || value === "both";

/**
 * Moves a plan you host. Only time and place: everything else about a plan is
 * settled once it's out, and the rules only let its host through anyway.
 *
 * The write stamps *what* moved next to *when* it moved. Notifications in this
 * app are derived from the plan documents themselves (see `buildNotifs`), so
 * without those two fields an edit is invisible to the friends it was sent to —
 * the plan quietly changes underneath them and nothing says so.
 */
export async function updatePlan(id: string, edit: PlanEdit): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const movedTime  = edit.timeLabel !== undefined || edit.startsAt !== undefined;
  const movedPlace = edit.location  !== undefined;

  const patch: Record<string, string | number | Timestamp | FieldValue> = {};
  if (edit.timeLabel !== undefined) patch.timeLabel = edit.timeLabel;
  if (edit.startsAt  !== undefined) patch.startsAt  = Timestamp.fromDate(edit.startsAt);
  if (edit.location  !== undefined) patch.location  = edit.location;
  if (edit.lat !== undefined) patch.lat = edit.lat === null ? deleteField() : edit.lat;
  if (edit.lng !== undefined) patch.lng = edit.lng === null ? deleteField() : edit.lng;

  // Only an edit that actually moved something is announced, and `updatedAt`
  // moves with it — the notification is keyed on that timestamp, so a second
  // edit arrives as a second unread row rather than reviving the first.
  if (movedTime || movedPlace) {
    patch.lastEditKind = movedTime && movedPlace ? "both" : movedTime ? "time" : "location";
    patch.updatedAt    = serverTimestamp();
  } else {
    return;   // nothing to change, and an empty write would still bump the doc
  }

  await updateDoc(doc(db, "plans", id), patch);
}

/**
 * Proposes a different time or place on a plan someone else hosts.
 *
 * Written onto the plan document rather than into a collection of its own, and
 * keyed by who made it. Three things fall out of that: the host is already
 * subscribed to their own plans, so a suggestion arrives in a snapshot they're
 * paying for anyway; no new query means no composite index to go and create;
 * and one person can only ever hold one open suggestion per plan, because a
 * second write lands on the same key.
 *
 * The security rules mirror `joinPlan`'s trick — the write is accepted only
 * from someone the plan was addressed to, only under their own uid, and only
 * when it touches nothing else on the document.
 */
export interface NewSuggestion {
  kind: "time" | "location";
  /** What the host will read: a time label, or a place name. */
  value: string;
  /** Required on a time suggestion — see `Suggestion.startsAt`. */
  startsAt?: Date;
  lat?: number;
  lng?: number;
}

export async function suggestChange(
  planId: string,
  s: NewSuggestion,
  myName: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await updateDoc(doc(db, "plans", planId), {
    [`suggestions.${user.uid}`]: {
      name:  myName || user.displayName || "",
      kind:  s.kind,
      value: s.value,
      // Firestore rejects an undefined value outright, so each of these is
      // spread in only when it actually exists.
      ...(s.startsAt ? { startsAt: Timestamp.fromDate(s.startsAt) } : {}),
      ...(typeof s.lat === "number" && typeof s.lng === "number"
        ? { lat: s.lat, lng: s.lng }
        : {}),
      // A client clock, as with `joinedAt`: `serverTimestamp()` isn't allowed
      // inside a map value, and this only drives a "4m ago" label.
      at: Timestamp.now(),
    },
  });
}

/**
 * Takes a friend up on their suggestion. One write, which does three things:
 * moves the plan, clears the suggestion now that it's been answered, and
 * stamps the edit — so accepting tells the whole audience the plan changed by
 * exactly the same route a manual edit does.
 */
export async function acceptSuggestion(planId: string, s: Suggestion): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  const patch: Record<string, unknown> = {
    [`suggestions.${s.uid}`]: deleteField(),
    lastEditKind: s.kind,
    updatedAt:    serverTimestamp(),
  };

  if (s.kind === "time") {
    patch.timeLabel = s.value;
    // The stored moment, or a best effort from the label for a suggestion made
    // before those were carried. A quick-chip label still parses.
    patch.startsAt = Timestamp.fromDate(s.startsAt ?? startsAtFor(s.value));
  } else {
    patch.location = s.value;
    // Cleared rather than left behind when the new place has no coordinates,
    // for the same reason `updatePlan` clears them.
    patch.lat = typeof s.lat === "number" ? s.lat : deleteField();
    patch.lng = typeof s.lng === "number" ? s.lng : deleteField();
  }

  await updateDoc(doc(db, "plans", planId), patch);
}

/** Declining one, or withdrawing your own — both just take it off the plan. */
export async function clearSuggestion(planId: string, uid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");
  await updateDoc(doc(db, "plans", planId), {
    [`suggestions.${uid}`]: deleteField(),
  });
}

/** The proposed changes on a plan, newest first. */
function toSuggestions(data: Record<string, unknown>): Suggestion[] {
  return Object.entries(asMap(data.suggestions))
    .map(([uid, raw]) => {
      const entry = asMap(raw);
      const at    = entry.at;
      return {
        uid,
        name:  String(entry.name ?? ""),
        kind:  entry.kind === "location" ? "location" as const : "time" as const,
        value: String(entry.value ?? ""),
        startsAt: entry.startsAt instanceof Timestamp ? entry.startsAt.toDate() : undefined,
        lat:   typeof entry.lat === "number" ? entry.lat : undefined,
        lng:   typeof entry.lng === "number" ? entry.lng : undefined,
        at:    at instanceof Timestamp ? at.toDate() : undefined,
      };
    })
    .filter((s) => s.value)
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
}

/**
 * How long a plan stays in a feed after its start time. Long enough that
 * "Coffee at 3" is still joinable at 3:20, short enough that yesterday's plans
 * don't pile up in a feed nobody can act on.
 *
 * Applied to Home and Explore alike: a plan you hosted last week is as spent as
 * one a friend hosted last week, and without this Home files it under "Later" —
 * which is true, and useless — for as long as the account exists.
 */
const FEED_GRACE_MS = 3 * 60 * 60 * 1000;

/** Whether a plan is still worth listing, by the window above. */
const stillLive = (plan: Plan) =>
  (plan.startsAt?.getTime() ?? 0) > Date.now() - FEED_GRACE_MS;

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
    for (const d of snap.docs) {
      const plan = toPlan(d.id, d.data(), uid);
      if (stillLive(plan)) map.set(d.id, plan);
    }
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
        .filter(stillLive);
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
    activity:    String(data.title ?? "Untitled sidequest"),
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
    updatedAt:   data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
    lastEdit:    isPlanEditKind(data.lastEditKind) ? data.lastEditKind : undefined,
    audienceUids: Array.isArray(data.audienceUids) ? data.audienceUids.map(String) : [],
    roster,
    suggestions: toSuggestions(data),
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
      return "Couldn't save the sidequest. Check your Firestore rules.";
    case "unavailable":
      return "Can't reach the server. Check your connection and try again.";
    case "not-signed-in":
      return "You're signed out. Log back in to share a sidequest.";
    default:
      return "Couldn't share the sidequest. Please try again.";
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
