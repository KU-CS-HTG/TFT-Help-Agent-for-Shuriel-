import type { ItemCategory, ItemTier, Rarity, Stage, Tier } from "./constants";

// 주의: 아래 타입들은 일부러 `interface`가 아닌 `type`으로 선언합니다.
// database.types.ts에서 supabase-js의 createClient<Database> 제네릭에 넘길 때
// interface를 쓰면 내부 GenericSchema 조건부 타입 검사에서 Insert/Update가
// never로 좁혀지는 TS 버그성 동작이 있어(object literal 기반 type만 정상 동작),
// 이 타입들을 그대로 재사용하는 database.types.ts와의 호환을 위해 type으로 둡니다.
export type Augment = {
  id: string;
  api_name: string;
  name: string;
  description_game: string;
  description_game_overridden: boolean;
  icon_url: string | null;
  /** 사용자가 아이콘을 직접 교체했는지 — true면 새로고침이 CDragon 원본으로 덮어쓰지 않음 */
  icon_url_overridden: boolean;
  /** 직접 교체한 아이콘의 Storage 경로 (CDragon 원본이면 null) */
  icon_storage_path: string | null;
  rarity: Rarity;
  /** 등급 기준 기본 배정 스테이지 (ingest가 채움, 화면 노출 여부와는 무관 — stages 참고) */
  stage: Stage;
  /** 이 증강체가 실제로 등장하는 스테이지 전부. 전부 비어있을 수도 있음(아직 미확인).
   * 사용자가 체크박스로 직접 관리하며, 새로고침이 절대 건드리지 않음. */
  stages: Stage[];
  set_number: number;
  patch_version: string;
  created_at: string;
  updated_at: string;
};

export type TierPlacement = {
  id: string;
  augment_id: string;
  stage: Stage;
  tier: Tier;
  position: number;
  updated_at: string;
};

export type AugmentNote = {
  augment_id: string;
  /** 메모는 스테이지별로 독립적 (tier_placements와 같은 방식) */
  stage: Stage;
  content: string;
  patch_version: string | null;
  updated_at: string;
};

export type AugmentImage = {
  id: string;
  augment_id: string;
  storage_path: string;
  url: string;
  position: number;
  created_at: string;
};

export type AugmentWithExtras = Augment & {
  placement: TierPlacement | null;
  note: AugmentNote | null;
  images: AugmentImage[];
};

/** 스테이지 전체에 대한 전략 메모 (개별 증강체 메모와 별개) */
export type StageNote = {
  stage: Stage;
  content: string;
  updated_at: string;
};

export type Deck = {
  id: string;
  name: string;
  main_image_url: string | null;
  main_image_storage_path: string | null;
  tips: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type DeckSubImage = {
  id: string;
  deck_id: string;
  storage_path: string;
  url: string;
  position: number;
  created_at: string;
};

export type DeckWithImages = Deck & {
  subImages: DeckSubImage[];
};

/** 아이템 원본 데이터 (Community Dragon에서 가져와 캐싱, 일반/유물/찬란 구분 없이 공용) */
export type Item = {
  id: string;
  api_name: string;
  name: string;
  icon_url: string | null;
  /** 게임 내 실제 능력치 설명 (Community Dragon 원본, 직접 수정 가능) */
  official_desc: string;
  /** 사용자가 능력치 설명을 직접 수정했는지 — true면 새로고침이 원본으로 덮어쓰지 않음 */
  official_desc_overridden: boolean;
  category: ItemCategory;
  /** 사용자가 아이템 모달에서 분류를 직접 옮겼는지 — true면 새로고침이 자동 추정으로 덮어쓰지 않음 */
  category_overridden: boolean;
  set_number: number;
  patch_version: string;
  created_at: string;
  updated_at: string;
};

/** 아이템 티어 배치. 아이템은 카테고리 하나에만 속하므로 스테이지 개념 없이 아이템당 하나. */
export type ItemTierPlacement = {
  id: string;
  item_id: string;
  tier: ItemTier;
  position: number;
  updated_at: string;
};

/** 아이템별 개인 메모 (게임 원본 설명과 별개) */
export type ItemNote = {
  item_id: string;
  content: string;
  updated_at: string;
};

export type ItemWithExtras = Item & {
  placement: ItemTierPlacement | null;
  note: ItemNote | null;
};
