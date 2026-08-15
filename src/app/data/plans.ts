import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  type FieldValue,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { NewPlan, Plan } from "../types";
import { ME } from "./currentUser";
import { auth, db } from "./firebase";

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
 * Saves a plan you created. Only your own plans are read back for now, so the
 * host fields are written for the benefit of a later "friends' plans" feed
 * rather than anything the Home tab reads today.
 */
export async function createPlan(plan: NewPlan, hostName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("not-signed-in");

  await addDoc(collection(db, "plans"), {
    hostUid:   user.uid,
    hostName:  hostName || user.displayName || "",
    title:     plan.title,
    emoji:     plan.emoji,
    color:     plan.color,
    timeLabel: plan.timeLabel,
    startsAt:  Timestamp.fromDate(plan.startsAt),
    location:  plan.location,
    group:     plan.group,
    flexTime:  plan.flexTime,
    flexLoc:   plan.flexLoc,
    createdAt: serverTimestamp(),
  });
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
 * Live view of the plans you host, soonest first.
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

  return onSnapshot(
    query(collection(db, "plans"), where("hostUid", "==", user.uid)),
    (snap) => {
      const plans = snap.docs.map((d) => toPlan(d.id, d.data()));
      plans.sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0));
      onPlans(plans);
    },
    onError,
  );
}

function toPlan(id: string, data: Record<string, unknown>): Plan {
  const color    = String(data.color ?? SKY);
  const startsAt = data.startsAt instanceof Timestamp ? data.startsAt.toDate() : new Date();

  return {
    id,
    emoji:       String(data.emoji ?? "👥"),
    activity:    String(data.title ?? "Untitled plan"),
    host:        "You",           // the query only returns plans you host
    avatar:      ME,
    avatarColor: color,
    accentColor: color,
    time:        formatWhen(startsAt),
    startsAt,
    location:    String(data.location ?? ""),
    group:       String(data.group ?? "Everyone"),
    description: "",
    attendees:   1,
    attendeeAvatars: [{ initials: ME, color }],
    flexTime:    Boolean(data.flexTime),
    flexLoc:     Boolean(data.flexLoc),
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

// ── Plans visible in Explore ───────────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id: "1", emoji: "☕", activity: "Coffee Run", host: "Mia K.", avatar: "MK", avatarColor: PEACH,
    time: "Now", distance: "0.3 mi", attendees: 3, accentColor: PEACH,
    location: "Blue Bottle, Hayes Valley", group: "College",
    description: "Quick coffee before afternoon classes. Anyone's welcome to join!",
    attendeeAvatars: [{ initials: "MK", color: PEACH }, { initials: "LT", color: SKY }, { initials: "YO", color: MINT }],
  },
  {
    id: "2", emoji: "🍕", activity: "Lunch Break", host: "Raj S.", avatar: "RS", avatarColor: CORAL,
    time: "12:30 PM", distance: "0.6 mi", attendees: 3, accentColor: CORAL,
    location: "Tony's Pizza, Union Sq", group: "Roommates",
    description: "Grabbing a slice. The more the merrier — let's make it a squad lunch.",
    attendeeAvatars: [{ initials: "RS", color: CORAL }, { initials: "CM", color: PEACH }],
  },
  {
    id: "3", emoji: "📚", activity: "Study Session", host: "Lily T.", avatar: "LT", avatarColor: SKY,
    time: "2:00 PM", distance: "1.1 mi", attendees: 2, accentColor: SKY,
    location: "Main Library, 4th floor", group: "College",
    description: "Finals prep — bringing snacks. Quiet study vibes only please.",
    attendeeAvatars: [{ initials: "LT", color: SKY }, { initials: "SP", color: LAVENDER }],
  },
  {
    id: "4", emoji: "🏋️", activity: "Gym Sesh", host: "Cole M.", avatar: "CM", avatarColor: MINT,
    time: "5:00 PM", distance: "0.8 mi", attendees: 2, accentColor: MINT,
    location: "Planet Fitness, Market St", group: "Roommates",
    description: "Leg day. Looking for a spotter and maybe some post-gym smoothies.",
    attendeeAvatars: [{ initials: "CM", color: MINT }],
  },
  {
    id: "5", emoji: "🎮", activity: "Gaming Night", host: "Zoe L.", avatar: "ZL", avatarColor: LAVENDER,
    time: "8:00 PM", distance: "1.4 mi", attendees: 5, accentColor: LAVENDER,
    location: "Zoe's Apartment, Mission", group: "College",
    description: "Mario Kart tournament. Bring your controllers & snacks. Losers do dishes.",
    attendeeAvatars: [{ initials: "ZL", color: LAVENDER }, { initials: "MK", color: PEACH }, { initials: "RS", color: CORAL }, { initials: "LT", color: SKY }],
  },
  {
    id: "6", emoji: "🎬", activity: "Movie Night", host: "Sam P.", avatar: "SP", avatarColor: "#A5D8FF",
    time: "7:00 PM", distance: "1.0 mi", attendees: 4, accentColor: "#A5D8FF",
    location: "AMC Metreon 16", group: "Friends",
    description: "Seeing the new Villeneuve film. Pre-buying tickets — confirm ASAP!",
    attendeeAvatars: [{ initials: "SP", color: "#A5D8FF" }, { initials: "YO", color: MINT }, { initials: "CM", color: PEACH }],
  },
];

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
