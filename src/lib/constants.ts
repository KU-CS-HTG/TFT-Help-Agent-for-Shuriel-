export const STAGES = ["2-1", "3-2", "4-2"] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export const RARITIES = ["silver", "gold", "prism"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_TO_STAGE: Record<Rarity, Stage> = {
  silver: "2-1",
  gold: "3-2",
  prism: "4-2",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  silver: "실버",
  gold: "골드",
  prism: "프리즘",
};

export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_COLOR: Record<Tier, string> = {
  S: "#e03131",
  A: "#f76707",
  B: "#f2b705",
  C: "#37b24d",
  D: "#1971c2",
};

export const CURRENT_SET_NUMBER = 18;
export const CURRENT_PATCH_VERSION = "18.2b";
