// 사용법: npm run seed:sample-items
// Community Dragon에 접근할 수 없는 환경에서 data/sample-items.json 의 더미
// 데이터를 DB에 넣어 아이템 티어리스트 화면 골격을 확인할 때 사용합니다.
// 실제 데이터가 필요하면 네트워크 제한이 없는 곳에서 npm run fetch:items 를 실행하세요.

import { config } from "dotenv";
import path from "node:path";
import { readFile } from "node:fs/promises";

config({ path: path.resolve(process.cwd(), ".env.local") });

interface SampleItem {
  apiName: string;
  name: string;
  officialDesc: string;
  category: "normal" | "artifact" | "radiant" | "trait";
}

async function main() {
  const { CURRENT_SET_NUMBER, CURRENT_PATCH_VERSION } = await import("../src/lib/constants");
  const { getSupabaseServerClient } = await import("../src/lib/supabase");

  const raw = await readFile(path.resolve(process.cwd(), "data/sample-items.json"), "utf-8");
  const parsed = JSON.parse(raw) as { items: SampleItem[] };

  const rows = parsed.items.map((item) => ({
    api_name: item.apiName,
    name: item.name,
    icon_url: null,
    official_desc: item.officialDesc,
    category: item.category,
    set_number: CURRENT_SET_NUMBER,
    patch_version: CURRENT_PATCH_VERSION,
  }));

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("items").upsert(rows, { onConflict: "api_name" });
  if (error) throw new Error(`DB upsert 실패: ${error.message}`);

  console.log(`샘플 아이템 ${rows.length}개를 DB에 넣었습니다 (실제 패치 데이터가 아닙니다).`);
}

main().catch((err) => {
  console.error("샘플 데이터 시딩 중 오류:", err);
  process.exit(1);
});
