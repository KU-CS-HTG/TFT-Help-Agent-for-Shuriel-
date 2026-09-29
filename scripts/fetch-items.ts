// 사용법: npm run fetch:items
// Community Dragon에서 최신 아이템(일반/유물/찬란/상징) 데이터를 가져와 Supabase
// DB에 upsert합니다. .env.local 에 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가
// 설정되어 있어야 합니다.
//
// 분류가 틀린 아이템이 있으면 data/item-category-overrides.json 의 entries에
// apiName을 키로 { "name": "...", "category": "normal"/"artifact"/"radiant"/"trait" }
// 를 직접 추가한 뒤 이 스크립트를 다시 실행하면 그 값이 우선 적용됩니다.

import { config } from "dotenv";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { isItemCategory } from "../src/lib/constants";

config({ path: path.resolve(process.cwd(), ".env.local") });

const OVERRIDES_PATH = path.resolve(process.cwd(), "data/item-category-overrides.json");

interface OverridesFile {
  _note: string;
  entries: Record<string, { name: string; category: string | null }>;
}

async function loadOverrides(): Promise<OverridesFile> {
  try {
    const raw = await readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(raw) as OverridesFile;
  } catch {
    return {
      _note:
        "아이템 분류(일반/유물/찬란/상징)가 잘못됐을 때 apiName을 키로 category를 직접 채워 넣는 파일입니다. " +
        "'normal'/'artifact'/'radiant'/'trait' 중 하나로 채운 뒤 다시 실행하면 그 값이 자동 추정보다 우선 적용됩니다.",
      entries: {},
    };
  }
}

async function main() {
  const { fetchAndParseItems, upsertItems } = await import("../src/lib/itemIngest");
  const { getSupabaseServerClient } = await import("../src/lib/supabase");

  const overridesFile = await loadOverrides();

  const categoryOverrides: Record<string, string> = {};
  const invalidEntries: Array<{ apiName: string; value: string }> = [];
  for (const [apiName, entry] of Object.entries(overridesFile.entries)) {
    if (entry.category === null) continue;
    if (isItemCategory(entry.category)) {
      categoryOverrides[apiName] = entry.category;
    } else {
      invalidEntries.push({ apiName, value: entry.category });
    }
  }
  console.log(`data/item-category-overrides.json에서 분류 ${Object.keys(categoryOverrides).length}건 불러옴.`);
  if (invalidEntries.length > 0) {
    console.warn(`\ndata/item-category-overrides.json 값이 normal/artifact/radiant/trait가 아닌 항목 ${invalidEntries.length}건 (무시됨):`);
    for (const { apiName, value } of invalidEntries) console.warn(`  - ${apiName}: "${value}"`);
  }

  console.log("Community Dragon에서 아이템 데이터를 가져오는 중...");
  const result = await fetchAndParseItems({ categoryOverrides });
  console.log(`파싱된 아이템 수: ${result.items.length} (패치 ${result.patchVersion})`);

  // 상징(trait) 목록은 매번 전체를 보여준다 — 빠지거나 설명이 안 바뀐 상징이
  // 있는지 눈으로 바로 확인할 수 있게(0개일 때만 뜨는 --- 진단 정보 ---와 별개).
  const traitItems = result.items.filter((i) => i.category === "trait");
  console.log(`\n상징(trait) 아이템 ${traitItems.length}개 파싱됨:`);
  for (const i of traitItems) {
    const descSnippet = i.officialDesc.replace(/\s+/g, " ").slice(0, 60);
    console.log(`  - ${i.name} (${i.apiName}): ${descSnippet}${i.officialDesc.length > 60 ? "..." : ""}`);
  }
  if (result.emblemLikeOutsideFilter.length > 0) {
    console.warn(
      `\n주의: apiName/이름에 "emblem"/"상징"이 들어있지만 위 목록에는 없는 항목이 ` +
        `${result.emblemLikeOutsideFilter.length}개 있습니다(다른 세트 상징/증강체 제외 규칙을 이미 적용하고 남은 것들이라 ` +
        `평소엔 0개가 정상 — 여기 뜨면 새로운 예외 케이스일 수 있으니 확인해주세요):`
    );
    for (const { apiName, name } of result.emblemLikeOutsideFilter) console.warn(`  - ${name} (${apiName})`);
  }

  const categoryWarnings = result.warnings.filter((w) => w.startsWith("분류를 판별할 수 없어"));
  const otherWarnings = result.warnings.filter((w) => !w.startsWith("분류를 판별할 수 없어"));

  if (otherWarnings.length > 0) {
    console.warn("\n경고:");
    for (const w of otherWarnings) console.warn(`  - ${w}`);
  }
  if (categoryWarnings.length > 0) {
    console.warn(`\n분류 판별 실패로 제외된 아이템: ${categoryWarnings.length}개 (처음 10개만 표시)`);
    for (const w of categoryWarnings.slice(0, 10)) console.warn(`  - ${w}`);
  }

  let addedCount = 0;
  for (const { apiName, name } of result.unresolvedForOverride) {
    if (!(apiName in overridesFile.entries)) {
      overridesFile.entries[apiName] = { name, category: null };
      addedCount += 1;
    }
  }
  if (addedCount > 0) {
    await writeFile(OVERRIDES_PATH, JSON.stringify(overridesFile, null, 2) + "\n", "utf-8");
    console.log(`\ndata/item-category-overrides.json에 새 항목 ${addedCount}개를 추가했습니다.`);
  }
  const pendingCount = Object.values(overridesFile.entries).filter((e) => e.category === null).length;
  if (pendingCount > 0) {
    console.log(
      `분류 미입력 상태(category: null)인 아이템이 ${pendingCount}개 있습니다. ` +
        `data/item-category-overrides.json을 열어 "normal"/"artifact"/"radiant"/"trait" 중 하나로 채운 뒤 다시 실행하면 반영됩니다.`
    );
  }

  if (result.debug) {
    console.error("\n--- 진단 정보 (이 블록 전체를 복사해서 알려주시면 파싱/분류 로직을 고칠 수 있습니다) ---");
    console.error(JSON.stringify(result.debug, null, 2));
    console.error("--- 진단 정보 끝 ---");
  }

  if (result.items.length === 0) {
    console.error("\n파싱된 아이템이 0개입니다. DB를 변경하지 않고 종료합니다.");
    console.error("data/sample-items.json 을 기반으로 한 더미 데이터를 대신 사용하려면");
    console.error("npm run seed:sample-items 를 실행하세요.");
    process.exit(1);
  }

  const supabase = getSupabaseServerClient();
  console.log("\nSupabase에 upsert하는 중 (아이콘 URL 검증 포함, 시간이 걸릴 수 있습니다)...");
  const summary = await upsertItems(supabase, result);

  console.log("\n완료!");
  console.log(
    `  총 ${summary.total}개 (일반 ${summary.byCategory.normal} / 유물 ${summary.byCategory.artifact} / 찬란 ${summary.byCategory.radiant} / 상징 ${summary.byCategory.trait})`
  );
  console.log(`  아이콘 확인됨: ${summary.iconsResolved}, 아이콘 못찾음: ${summary.iconsMissing}`);

  if (summary.warnings.length > 0) {
    console.warn(`\n세부 경고 ${summary.warnings.length}건 (일부만 표시):`);
    for (const w of summary.warnings.slice(0, 20)) console.warn(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error("아이템 데이터 수집 중 오류 발생:", err);
  process.exit(1);
});
