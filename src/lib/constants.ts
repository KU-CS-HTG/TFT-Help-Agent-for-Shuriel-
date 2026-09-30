export const STAGES = ["2-1", "3-2", "4-2"] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export const RARITIES = ["silver", "gold", "prism"] as const;
export type Rarity = (typeof RARITIES)[number];

export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && (RARITIES as readonly string[]).includes(value);
}

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

export const ITEM_CATEGORIES = ["normal", "artifact", "radiant", "trait"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === "string" && (ITEM_CATEGORIES as readonly string[]).includes(value);
}

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  normal: "일반 아이템",
  artifact: "유물 아이템",
  radiant: "찬란한 아이템",
  trait: "상징 아이템",
};

// 아이템 티어보드는 증강체(S~D)와 달리 S~C 4단계만 씁니다.
export const ITEM_TIERS = ["S", "A", "B", "C"] as const;
export type ItemTier = (typeof ITEM_TIERS)[number];

// 덱에 매다는 추천 증강체/아이템은 "강력 추천"/"추천" 두 단계로만 구분합니다.
export const RECOMMEND_TIERS = ["strong", "normal"] as const;
export type RecommendTier = (typeof RECOMMEND_TIERS)[number];

export function isRecommendTier(value: unknown): value is RecommendTier {
  return typeof value === "string" && (RECOMMEND_TIERS as readonly string[]).includes(value);
}

export const RECOMMEND_TIER_LABEL: Record<RecommendTier, string> = {
  strong: "강력 추천",
  normal: "추천",
};
