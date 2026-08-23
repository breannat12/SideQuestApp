// ── Shared types ───────────────────────────────────────────────────────────
export type Tab = "home" | "explore" | "create" | "friends" | "profile";

/** `loading` is the splash held while Firebase reports whether a session exists. */
export type Screen =
  | "loading" | "welcome" | "signup" | "login" | "createProfile" | "onboarding" | "app";

export type FriendStatus = "available" | "busy" | "dnd";

export interface Plan {
  /** Firestore document id for saved plans; a stable string for seeded ones. */
  id: string; emoji: string; activity: string;
  host: string; avatar: string; avatarColor: string;
  time: string; attendees: number;
  accentColor: string; location: string; group: string;
  description: string; attendeeAvatars: { initials: string; color: string }[];
  /** "0.3 mi", once the plan's coordinates and yours are both known. */
  distance?: string;
  /** The same figure unrounded, for sorting by proximity. */
  distanceMiles?: number;
  /** Where it is. Absent when the location was typed rather than picked. */
  lat?: number;
  lng?: number;
  /** When it actually starts. Drives the Today / Later split on Home. */
  startsAt?: Date;
  flexTime?: boolean;
  flexLoc?: boolean;
  /** Who hosts it. Absent on seeded plans, which have no account behind them. */
  hostUid?: string;
  /** When it was shared. Orders the "new plan from…" notifications. */
  createdAt?: Date;
  /** Friend uids the host sent it to — the audience that can see and join it. */
  audienceUids?: string[];
  /** Everyone who's in, host first. `attendees` is just its length. */
  roster?: Attendee[];
}

/** One person on a plan's roster, as stored in the plan's attendee maps. */
export interface Attendee {
  uid: string; name: string;
  /** Absent for the instant between a local write and the server's reply. */
  joinedAt?: Date;
}

/** Everything the create flow collects, before it becomes a stored plan. */
export interface NewPlan {
  title: string; emoji: string; color: string;
  timeLabel: string; startsAt: Date;
  location: string; group: string;
  flexTime: boolean; flexLoc: boolean;
  /** From the picked place, or your own position for a plan set "here". */
  lat?: number;
  lng?: number;
}

export interface Notif {
  /** Derived from what it's about ("plan:{planId}"), not a counter — that's
      what lets a read receipt survive a reload and a re-derive. */
  id: string;
  // COINCIDENCE FEATURE -- the "coincidence" notification kind. Restore it to
  // this union alongside the icon branch in NotifDrawer.
  // type: "coincidence" | "join" | "plan" | "ping" | "request";
  type: "join" | "plan" | "ping" | "request";
  title: string; body: string; read: boolean;
  /** When it happened. The drawer shows this as "4m ago". */
  at: Date;
  /** The plan behind it, so tapping the row can open that plan. */
  planId?: string;
  /** Set on "request" rows — what the Accept and Ignore buttons act on. */
  request?: FriendRequest;
}

/**
 * A pending invitation, from `friendRequests/{fromUid}_{toUid}`.
 *
 * The document existing *is* the pending state: accepting and ignoring both
 * delete it, so there's no status field to read, and no way to end up with a
 * request that says "pending" long after it was answered.
 */
export interface FriendRequest {
  /** Always `{fromUid}_{toUid}`, which is what stops duplicate requests. */
  id: string;
  fromUid: string; fromName: string; fromUsername: string;
  toUid: string;
  /** Absent for the instant between a local write and the server's reply. */
  createdAt?: Date;
}

// COINCIDENCE FEATURE -- shape of a "friend is nearby and free right now"
// alert, as rendered by CoincidenceSection.
// export interface CoincidenceAlert {
//   id: number; name: string; avatar: string; avatarColor: string;
//   distance: string; status: string; location: string; time: string;
// }

/** A group you made, as stored in `users/{uid}/groups/{groupId}`. */
export interface Group {
  id: string; name: string; emoji: string; color: string;
  /** Friend uids. The member count is just its length. */
  memberUids: string[];
  /** Absent for the instant between a local write and the server's reply. */
  createdAt?: Date;
}

/** What the group editor collects, before it becomes a stored group. */
export interface NewGroup {
  name: string; emoji: string; color: string; memberUids: string[];
}

/** Someone you've added, from `users/{uid}/friends/{friendUid}`. */
export interface Friend {
  uid: string; name: string; username: string;
  /** Initials for the avatar bubble, and a colour picked from their uid. */
  avatar: string; color: string;
}

/** A real signed-up person, as stored in the `users` collection. */
export interface DirectoryUser {
  uid: string; username: string; name: string;
}

/** Your own row from `users/{uid}`, reduced to what the UI actually shows. */
export interface StoredProfile {
  name: string; handle: string;
  /** Alert radius in miles, already clamped to the slider's range. */
  radius: number;
}

/** A searchable real-world place. Carries coordinates for distance math. */
export interface Place {
  id: string; name: string; address: string; category: string;
  lat: number; lng: number;
}

export interface Activity {
  label: string; emoji: string; color: string;
}
