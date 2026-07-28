import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Activity } from "../types";

export const ACTIVITIES: Activity[] = [
  { label: "Food",   emoji: "🍕", color: CORAL     },
  { label: "Coffee", emoji: "☕", color: PEACH     },
  { label: "Study",  emoji: "📚", color: SKY       },
  { label: "Gym",    emoji: "🏋️", color: MINT      },
  { label: "Games",  emoji: "🎮", color: LAVENDER  },
  { label: "Movies", emoji: "🎬", color: "#A5D8FF" },
  { label: "Music",  emoji: "🎵", color: "#FFC9DE" },
];

export const TIME_SUGGESTIONS = ["Now", "In 30 min", "In 1 hr", "In 2 hrs", "Tonight", "Tomorrow morning"];

export const LOCATION_SUGGESTIONS = [
  "Blue Bottle, Hayes Valley",
  "Sightglass Coffee, SoMa",
  "Dolores Park",
  "Main Library, 4th floor",
  "Tony's Pizza, Union Sq",
  "Tartine Bakery, Mission",
];
