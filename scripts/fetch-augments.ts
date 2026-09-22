// 사용법: npm run fetch:augments
// Community Dragon에서 최신 증강체 데이터를 가져와 Supabase DB에 upsert합니다.
// .env.local 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있어야 합니다.
//
// 이 스크립트는 이 프로젝트가 만들어진 샌드박스 환경에서는 조직 네트워크
// 정책 때문에 raw.communitydragon.org에 접근할 수 없어 실제 응답으로
// 검증하지 못했습니다. 로컬(또는 CI)에서 실행했을 때 파싱이 잘 안 되면
// 콘솔에 출력되는 warnings를 보고 src/lib/ingest.ts의 guessRarity /
// setData 파싱 부분을 조정하세요.

import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { fetchAndParseAugments, upsertAugments } = await import("../src/lib/ingest");
  const { getSupabaseServerClient } = await import("../src/lib/supabase");

  console.log("Community Dragon에서 증강체 데이터를 가져오는 중...");
  const result = await fetchAndParseAugments();
  console.log(`파싱된 증강체 수: ${result.augments.length} (패치 ${result.patchVersion})`);

  if (result.warnings.length > 0) {
    console.warn("\n경고:");
    for (const w of result.warnings) console.warn(`  - ${w}`);
  }

  if (result.augments.length === 0) {
    console.error("\n파싱된 증강체가 0개입니다. DB를 변경하지 않고 종료합니다.");
    console.error("data/sample-augments.json 을 기반으로 한 더미 데이터를 대신 사용하려면");
    console.error("npm run seed:sample 을 실행하세요.");
    process.exit(1);
  }

  const supabase = getSupabaseServerClient();
  console.log("\nSupabase에 upsert하는 중 (아이콘 URL 검증 포함, 시간이 걸릴 수 있습니다)...");
  const summary = await upsertAugments(supabase, result);

  console.log("\n완료!");
  console.log(`  총 ${summary.total}개 (실버 ${summary.bySilverGoldPrism.silver} / 골드 ${summary.bySilverGoldPrism.gold} / 프리즘 ${summary.bySilverGoldPrism.prism})`);
  console.log(`  아이콘 확인됨: ${summary.iconsResolved}, 아이콘 못찾음: ${summary.iconsMissing}`);

  if (summary.warnings.length > 0) {
    console.warn(`\n세부 경고 ${summary.warnings.length}건 (일부만 표시):`);
    for (const w of summary.warnings.slice(0, 20)) console.warn(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error("데이터 수집 중 오류 발생:", err);
  process.exit(1);
});
