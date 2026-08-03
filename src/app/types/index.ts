// ── Shared types ───────────────────────────────────────────────────────────
export type Tab    = "home" | "explore" | "create" | "friends" | "profile";
export type Screen = "welcome" | "signup" | "createProfile" | "onboarding" | "app";

export type FriendStatus = "available" | "busy" | "dnd";

export interface Plan {
  id: number; emoji: string; activity: string;
  host: string; avatar: string; avatarColor: string;
  time: string; distance: string; attendees: number;
  accentColor: string; location: string; group: string;
  description: string; attendeeAvatars: { initials: string; color: string }[];
}

export interface Notif {
  id: number; type: "coincidence" | "join" | "plan" | "ping";
  title: string; body: string; time: string; read: boolean;
}

export interface CoincidenceAlert {
  id: number; name: string; avatar: string; avatarColor: string;
  distance: string; status: string; location: string; time: string;
}

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

export interface Activity {
  label: string; emoji: string; color: string;
}
