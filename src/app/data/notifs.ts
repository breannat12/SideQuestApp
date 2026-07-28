import type { Notif } from "../types";

export const NOTIFS: Notif[] = [
  { id: 1, type: "coincidence", title: "⚡ Mia is 0.2 mi away!",  body: "She's free right now — coffee shop nearby.", time: "Just now", read: false },
  { id: 2, type: "join",        title: "Cole joined your plan",   body: "Cole M. joined your Gym Sesh at 5 PM.",      time: "4m ago",   read: false },
  { id: 3, type: "plan",        title: "New plan from Raj",       body: "Raj created a Lunch Break — 3 going.",       time: "20m ago",  read: false },
  { id: 4, type: "ping",        title: "Lily pinged you 👋",      body: "She says: \"Free this afternoon for study?\"", time: "1h ago",   read: true  },
  { id: 5, type: "plan",        title: "Gaming Night tonight 🎮", body: "Zoe's hosting — 5 people going, 8 PM.",      time: "2h ago",   read: true  },
];
