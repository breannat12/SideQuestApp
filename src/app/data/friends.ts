import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Friend } from "../types";

// COINCIDENCE FEATURE -- seed data for the nearby-and-free alerts on Home.
// Restore alongside the CoincidenceAlert type and CoincidenceSection.
// export const COINCIDENCE_ALERTS: CoincidenceAlert[] = [
//   { id: 1, name: "Mia K.",  avatar: "MK", avatarColor: PEACH,    distance: "0.2 mi", status: "Free now",          location: "Blue Bottle nearby",      time: "Just now" },
//   { id: 2, name: "Cole M.", avatar: "CM", avatarColor: MINT,     distance: "0.5 mi", status: "Up for anything",   location: "Near Whole Foods",        time: "3m ago"   },
//   { id: 3, name: "Lily T.", avatar: "LT", avatarColor: SKY,      distance: "0.8 mi", status: "Free all afternoon",location: "Main Library area",        time: "8m ago"   },
// ];

export const FRIENDS_DATA: Friend[] = [
  { name: "Mia K.",  avatar: "MK", status: "available", activity: "Open for coffee ☕",         color: PEACH,     lastSeen: "Now",     groups: ["College"]              },
  { name: "Raj S.",  avatar: "RS", status: "busy",      activity: "In class until 2 PM 📖",     color: CORAL,     lastSeen: "1h ago",  groups: ["Roommates", "College"] },
  { name: "Lily T.", avatar: "LT", status: "available", activity: "Free all afternoon 🌤",      color: SKY,       lastSeen: "Now",     groups: ["College"]              },
  { name: "Cole M.", avatar: "CM", status: "available", activity: "Up for literally anything",  color: MINT,      lastSeen: "5m ago",  groups: ["Roommates"]            },
  { name: "Zoe L.",  avatar: "ZL", status: "dnd",       activity: "Do not disturb 🔕",          color: LAVENDER,  lastSeen: "3h ago",  groups: ["Clubs", "College"]     },
  { name: "Sam P.",  avatar: "SP", status: "available", activity: "Planning movie night 🎬",    color: "#A5D8FF", lastSeen: "12m ago", groups: ["Friends"]              },
  { name: "Yara O.", avatar: "YO", status: "busy",      activity: "At work until 6 PM",         color: "#FFC9DE", lastSeen: "2h ago",  groups: ["Family"]               },
];
