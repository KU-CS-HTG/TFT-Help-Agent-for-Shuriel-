import type { Rarity, Stage, Tier } from "./constants";

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
  rarity: Rarity;
  stage: Stage;
  /** stage 외에 추가로 등장하는 스테이지 (사용자가 직접 관리, 새로고침이 건드리지 않음) */
  extra_stages: Stage[];
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
