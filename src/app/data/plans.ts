import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Plan } from "../types";

// ── Plans visible in Explore ───────────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id: 1, emoji: "☕", activity: "Coffee Run", host: "Mia K.", avatar: "MK", avatarColor: PEACH,
    time: "Now", distance: "0.3 mi", attendees: 3, accentColor: PEACH,
    location: "Blue Bottle, Hayes Valley", group: "College",
    description: "Quick coffee before afternoon classes. Anyone's welcome to join!",
    attendeeAvatars: [{ initials: "MK", color: PEACH }, { initials: "LT", color: SKY }, { initials: "YO", color: MINT }],
  },
  {
    id: 2, emoji: "🍕", activity: "Lunch Break", host: "Raj S.", avatar: "RS", avatarColor: CORAL,
    time: "12:30 PM", distance: "0.6 mi", attendees: 3, accentColor: CORAL,
    location: "Tony's Pizza, Union Sq", group: "Roommates",
    description: "Grabbing a slice. The more the merrier — let's make it a squad lunch.",
    attendeeAvatars: [{ initials: "RS", color: CORAL }, { initials: "CM", color: PEACH }],
  },
  {
    id: 3, emoji: "📚", activity: "Study Session", host: "Lily T.", avatar: "LT", avatarColor: SKY,
    time: "2:00 PM", distance: "1.1 mi", attendees: 2, accentColor: SKY,
    location: "Main Library, 4th floor", group: "College",
    description: "Finals prep — bringing snacks. Quiet study vibes only please.",
    attendeeAvatars: [{ initials: "LT", color: SKY }, { initials: "SP", color: LAVENDER }],
  },
  {
    id: 4, emoji: "🏋️", activity: "Gym Sesh", host: "Cole M.", avatar: "CM", avatarColor: MINT,
    time: "5:00 PM", distance: "0.8 mi", attendees: 2, accentColor: MINT,
    location: "Planet Fitness, Market St", group: "Roommates",
    description: "Leg day. Looking for a spotter and maybe some post-gym smoothies.",
    attendeeAvatars: [{ initials: "CM", color: MINT }],
  },
  {
    id: 5, emoji: "🎮", activity: "Gaming Night", host: "Zoe L.", avatar: "ZL", avatarColor: LAVENDER,
    time: "8:00 PM", distance: "1.4 mi", attendees: 5, accentColor: LAVENDER,
    location: "Zoe's Apartment, Mission", group: "College",
    description: "Mario Kart tournament. Bring your controllers & snacks. Losers do dishes.",
    attendeeAvatars: [{ initials: "ZL", color: LAVENDER }, { initials: "MK", color: PEACH }, { initials: "RS", color: CORAL }, { initials: "LT", color: SKY }],
  },
  {
    id: 6, emoji: "🎬", activity: "Movie Night", host: "Sam P.", avatar: "SP", avatarColor: "#A5D8FF",
    time: "7:00 PM", distance: "1.0 mi", attendees: 4, accentColor: "#A5D8FF",
    location: "AMC Metreon 16", group: "Friends",
    description: "Seeing the new Villeneuve film. Pre-buying tickets — confirm ASAP!",
    attendeeAvatars: [{ initials: "SP", color: "#A5D8FF" }, { initials: "YO", color: MINT }, { initials: "CM", color: PEACH }],
  },
];

// ── My Plans (created or RSVP'd by Alex) ───────────────────────────────────
export const MY_PLANS_TODAY: Plan[] = [
  {
    id: 101, emoji: "☕", activity: "Coffee Run", host: "You", avatar: "AX", avatarColor: SKY,
    time: "Now", distance: "0.3 mi", attendees: 3, accentColor: SKY,
    location: "Blue Bottle, Hayes Valley", group: "College",
    description: "Grabbing a quick coffee before afternoon classes.",
    attendeeAvatars: [{ initials: "AX", color: SKY }, { initials: "MK", color: PEACH }, { initials: "LT", color: MINT }],
  },
  {
    id: 102, emoji: "📚", activity: "Study Session", host: "Lily T.", avatar: "LT", avatarColor: SKY,
    time: "2:00 PM", distance: "1.1 mi", attendees: 3, accentColor: SKY,
    location: "Main Library, 4th floor", group: "College",
    description: "Finals prep — bringing snacks. Quiet study vibes only.",
    attendeeAvatars: [{ initials: "LT", color: SKY }, { initials: "AX", color: SKY }, { initials: "SP", color: LAVENDER }],
  },
  {
    id: 103, emoji: "🏋️", activity: "Gym Sesh", host: "You", avatar: "AX", avatarColor: MINT,
    time: "5:00 PM", distance: "0.8 mi", attendees: 2, accentColor: MINT,
    location: "Planet Fitness, Market St", group: "Roommates",
    description: "Leg day — looking for a spotter.",
    attendeeAvatars: [{ initials: "AX", color: MINT }, { initials: "CM", color: MINT }],
  },
];

export const MY_PLANS_LATER: Plan[] = [
  {
    id: 104, emoji: "🎮", activity: "Gaming Night", host: "Zoe L.", avatar: "ZL", avatarColor: LAVENDER,
    time: "Sat 8 PM", distance: "1.4 mi", attendees: 5, accentColor: LAVENDER,
    location: "Zoe's Apartment, Mission", group: "College",
    description: "Mario Kart tournament. Bring controllers & snacks.",
    attendeeAvatars: [{ initials: "ZL", color: LAVENDER }, { initials: "AX", color: SKY }, { initials: "MK", color: PEACH }],
  },
  {
    id: 105, emoji: "🎬", activity: "Movie Night", host: "Sam P.", avatar: "SP", avatarColor: "#A5D8FF",
    time: "Sun 7 PM", distance: "1.0 mi", attendees: 4, accentColor: "#A5D8FF",
    location: "AMC Metreon 16", group: "Friends",
    description: "New Villeneuve film. Pre-buying tickets — confirm ASAP!",
    attendeeAvatars: [{ initials: "SP", color: "#A5D8FF" }, { initials: "AX", color: SKY }, { initials: "YO", color: MINT }],
  },
];
