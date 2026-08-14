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

/**
 * Emoji a plan can be badged with, each paired with the accent colour its card
 * picks up. The first entry is the default: deliberately generic, so a plan
 * that doesn't fit any category still looks deliberate rather than unfinished.
 */
export const PLAN_EMOJIS: { emoji: string; color: string }[] = [
  { emoji: "👥", color: SKY       },
  { emoji: "☕", color: PEACH     },
  { emoji: "🍕", color: CORAL     },
  { emoji: "🍔", color: CORAL     },
  { emoji: "🌮", color: PEACH     },
  { emoji: "🍣", color: CORAL     },
  { emoji: "🍺", color: PEACH     },
  { emoji: "🍦", color: "#FFC9DE" },
  { emoji: "🎂", color: "#FFC9DE" },
  { emoji: "📚", color: SKY       },
  { emoji: "💻", color: SKY       },
  { emoji: "🎮", color: LAVENDER  },
  { emoji: "🎬", color: "#A5D8FF" },
  { emoji: "🎵", color: "#FFC9DE" },
  { emoji: "🎤", color: LAVENDER  },
  { emoji: "🎨", color: LAVENDER  },
  { emoji: "🏋️", color: MINT      },
  { emoji: "🏃", color: MINT      },
  { emoji: "⚽", color: MINT      },
  { emoji: "🏀", color: CORAL     },
  { emoji: "🧘", color: MINT      },
  { emoji: "🚴", color: MINT      },
  { emoji: "🥾", color: MINT      },
  { emoji: "🌳", color: MINT      },
  { emoji: "🏖️", color: "#A5D8FF" },
  { emoji: "🎉", color: CORAL     },
  { emoji: "🛍️", color: LAVENDER  },
  { emoji: "✈️", color: SKY       },
  { emoji: "🚗", color: SKY       },
  { emoji: "🐶", color: PEACH     },
];

/** The badge a plan gets when nothing else is chosen. */
export const DEFAULT_PLAN_EMOJI = PLAN_EMOJIS[0];

export const TIME_SUGGESTIONS = ["Now", "In 30 min", "In 1 hr", "In 2 hrs", "Tonight", "Tomorrow morning"];

export const LOCATION_SUGGESTIONS = [
  "Blue Bottle, Hayes Valley",
  "Sightglass Coffee, SoMa",
  "Dolores Park",
  "Main Library, 4th floor",
  "Tony's Pizza, Union Sq",
  "Tartine Bakery, Mission",
];
