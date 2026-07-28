import { CORAL, LAVENDER, MINT, PEACH, SKY } from "../constants/colors";
import type { Group } from "../types";

export const INITIAL_GROUPS: Group[] = [
  { name: "College",   count: 12, emoji: "🎓", color: SKY      },
  { name: "Roommates", count: 3,  emoji: "🏠", color: MINT     },
  { name: "Family",    count: 5,  emoji: "❤️", color: CORAL    },
  { name: "Clubs",     count: 8,  emoji: "🎭", color: LAVENDER },
];

export const GROUP_EMOJIS = ["🎓", "🏠", "❤️", "🎭", "⚽", "🎸", "🍕", "🌿"];
export const GROUP_COLORS = [SKY, MINT, CORAL, LAVENDER, PEACH, "#FFC9DE", "#A5D8FF", "#B2F5D4"];
