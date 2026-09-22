import type { Augment, AugmentImage, AugmentNote, TierPlacement } from "./types";

// supabase-js는 Database 제네릭이 없으면(기본값 any) 일부 버전에서 insert/upsert
// 페이로드 타입이 never로 좁혀지는 문제가 있어, 테이블 Row 모양을 직접 선언해
// createClient<Database>로 넘겨줍니다. `supabase gen types`로 생성한 진짜 타입은
// 아니므로 Insert/Update는 넉넉하게 Partial<Row>로 둡니다.
interface Table<Row> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      augments: Table<Augment>;
      tier_placements: Table<TierPlacement>;
      augment_notes: Table<AugmentNote>;
      augment_images: Table<AugmentImage>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
