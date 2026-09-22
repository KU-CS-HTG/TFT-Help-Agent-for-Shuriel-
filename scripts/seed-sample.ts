// 사용법: npm run seed:sample
// Community Dragon에 접근할 수 없는 환경(예: 이 프로젝트가 만들어진 샌드박스)에서
// data/sample-augments.json 의 더미 데이터를 DB에 넣어 앱 골격을 확인할 때 사용합니다.
// 실제 데이터가 필요하면 네트워크 제한이 없는 곳에서 npm run fetch:augments 를 실행하세요.

import { config } from "dotenv";
import path from "node:path";
import { readFile } from "node:fs/promises";

config({ path: path.resolve(process.cwd(), ".env.local") });

interface SampleAugment {
  apiName: string;
  name: string;
  descriptionGame: string;
  rarity: "silver" | "gold" | "prism";
}

async function main() {
  const { RARITY_TO_STAGE, CURRENT_SET_NUMBER, CURRENT_PATCH_VERSION } = await import("../src/lib/constants");
  const { getSupabaseServerClient } = await import("../src/lib/supabase");

  const raw = await readFile(path.resolve(process.cwd(), "data/sample-augments.json"), "utf-8");
  const parsed = JSON.parse(raw) as { augments: SampleAugment[] };

  const rows = parsed.augments.map((a) => ({
    api_name: a.apiName,
    name: a.name,
    description_game: a.descriptionGame,
    icon_url: null,
    rarity: a.rarity,
    stage: RARITY_TO_STAGE[a.rarity],
    set_number: CURRENT_SET_NUMBER,
    patch_version: CURRENT_PATCH_VERSION,
  }));

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("augments").upsert(rows, { onConflict: "api_name" });
  if (error) throw new Error(`DB upsert 실패: ${error.message}`);

  console.log(`샘플 증강체 ${rows.length}개를 DB에 넣었습니다 (실제 패치 데이터가 아닙니다).`);
}

main().catch((err) => {
  console.error("샘플 데이터 시딩 중 오류:", err);
  process.exit(1);
});
