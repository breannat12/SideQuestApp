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
  /** Absent on plans you created — there's no distance maths behind them yet. */
  distance?: string;
  /** When it actually starts. Drives the Today / Later split on Home. */
  startsAt?: Date;
  flexTime?: boolean;
  flexLoc?: boolean;
}

/** Everything the create flow collects, before it becomes a stored plan. */
export interface NewPlan {
  title: string; emoji: string; color: string;
  timeLabel: string; startsAt: Date;
  location: string; group: string;
  flexTime: boolean; flexLoc: boolean;
}

export interface Notif {
  id: number;
  // COINCIDENCE FEATURE -- the "coincidence" notification kind. Restore it to
  // this union alongside the icon branch in NotifDrawer.
  // type: "coincidence" | "join" | "plan" | "ping";
  type: "join" | "plan" | "ping";
  title: string; body: string; time: string; read: boolean;
}

// COINCIDENCE FEATURE -- shape of a "friend is nearby and free right now"
// alert, as rendered by CoincidenceSection.
// export interface CoincidenceAlert {
//   id: number; name: string; avatar: string; avatarColor: string;
//   distance: string; status: string; location: string; time: string;
// }

export interface Group {
  name: string; count: number; emoji: string; color: string;
}

export interface Friend {
  name: string; avatar: string; status: FriendStatus;
  activity: string; color: string; lastSeen: string; groups: string[];
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
