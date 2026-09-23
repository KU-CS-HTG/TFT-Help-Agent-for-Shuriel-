// 사용법: npm run fetch:augments
// Community Dragon에서 최신 증강체 데이터를 가져와 Supabase DB에 upsert합니다.
// .env.local 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있어야 합니다.
//
// Community Dragon의 ko_kr.json에는 증강체 등급(실버/골드/프리즘) 정보가
// 들어있지 않은 것으로 실측 확인되었습니다. 등급을 못 찾은 증강체는
// data/rarity-overrides.json 의 entries에 rarity: null 상태로 자동
// 추가되니, 실제 등급을 아신다면 "silver" / "gold" / "prism" 중 하나로
// 채운 뒤 이 스크립트를 다시 실행해 주세요.

import { config } from "dotenv";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import type { Rarity } from "../src/lib/constants";

config({ path: path.resolve(process.cwd(), ".env.local") });

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/rarity-overrides.json");

interface OverridesFile {
  _note: string;
  entries: Record<string, { name: string; rarity: Rarity | null }>;
}

async function loadOverrides(): Promise<OverridesFile> {
  try {
    const raw = await readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(raw) as OverridesFile;
  } catch {
    return {
      _note:
        "Community Dragon 데이터에는 증강체 등급(실버/골드/프리즘) 정보가 들어있지 않습니다. " +
        "rarity: null인 항목에 실제 등급('silver'/'gold'/'prism')을 채우고 다시 실행하세요.",
      entries: {},
    };
  }
}

async function main() {
  const { fetchAndParseAugments, upsertAugments } = await import("../src/lib/ingest");
  const { getSupabaseServerClient } = await import("../src/lib/supabase");

  const overridesFile = await loadOverrides();
  const rarityOverrides: Record<string, Rarity> = {};
  for (const [apiName, entry] of Object.entries(overridesFile.entries)) {
    if (entry.rarity) rarityOverrides[apiName] = entry.rarity;
  }
  console.log(`data/rarity-overrides.json에서 등급 ${Object.keys(rarityOverrides).length}건 불러옴.`);

  console.log("Community Dragon에서 증강체 데이터를 가져오는 중...");
  const result = await fetchAndParseAugments({ rarityOverrides });
  console.log(`파싱된 증강체 수: ${result.augments.length} (패치 ${result.patchVersion})`);

  const rarityWarnings = result.warnings.filter((w) => w.startsWith("등급을 판별할 수 없어"));
  const otherWarnings = result.warnings.filter((w) => !w.startsWith("등급을 판별할 수 없어"));

  if (otherWarnings.length > 0) {
    console.warn("\n경고:");
    for (const w of otherWarnings) console.warn(`  - ${w}`);
  }
  if (rarityWarnings.length > 0) {
    console.warn(`\n등급 판별 실패로 제외된 증강체: ${rarityWarnings.length}개 (처음 10개만 표시)`);
    for (const w of rarityWarnings.slice(0, 10)) console.warn(`  - ${w}`);
  }

  // 새로 발견된(아직 overrides 파일에 없는) 미판별 증강체를 추가하고 저장
  let addedCount = 0;
  for (const { apiName, name } of result.unresolvedForOverride) {
    if (!(apiName in overridesFile.entries)) {
      overridesFile.entries[apiName] = { name, rarity: null };
      addedCount += 1;
    }
  }
  if (addedCount > 0) {
    await writeFile(OVERRIDES_PATH, JSON.stringify(overridesFile, null, 2) + "\n", "utf-8");
    console.log(`\ndata/rarity-overrides.json에 새 항목 ${addedCount}개를 추가했습니다.`);
  }
  const pendingCount = Object.values(overridesFile.entries).filter((e) => e.rarity === null).length;
  if (pendingCount > 0) {
    console.log(
      `등급 미입력 상태(rarity: null)인 증강체가 ${pendingCount}개 있습니다. ` +
        `data/rarity-overrides.json을 열어 "silver"/"gold"/"prism" 중 하나로 채운 뒤 다시 실행하면 반영됩니다.`
    );
  }

  if (result.debug) {
    console.error("\n--- 진단 정보 (이 블록 전체를 복사해서 알려주시면 파싱 로직을 고칠 수 있습니다) ---");
    console.error(JSON.stringify(result.debug, null, 2));
    console.error("--- 진단 정보 끝 ---");
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
