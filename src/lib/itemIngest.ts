// 아이템(일반/유물/찬란) 데이터 수집 로직. src/lib/ingest.ts(증강체 ingest)와
// 같은 Community Dragon ko_kr.json의 data.items 배열을 공유해서 읽습니다
// (실측 확인: 증강체도 apiName이 "DA_"로 시작하는 data.items 항목이라, 실제
// 아이템은 같은 배열에서 apiName이 "TFT_Item_"으로 시작하는 항목들입니다).
//
// 주의: 이 파일도 증강체 ingest.ts와 마찬가지로 이 샌드박스 환경에서는
// raw.communitydragon.org 접근이 막혀 있어 실제 응답으로 검증하지 못했습니다.
// 일반/유물/찬란 구분은 apiName에 "Radiant"/"Artifact"가 들어있는지, 그리고
// 조합 재료 배열(from/composition/recipe 중 있는 필드) 길이로 최선의 추정만
// 했습니다. 분류가 틀렸거나 npm run fetch:items 실행 시 파싱된 아이템 수가
// 이상하면, 콘솔에 출력되는 "--- 진단 정보 ---" 블록을 보고 이 파일의
// guessCategory() 근처를 조정하세요.

import { CURRENT_SET_NUMBER, isItemCategory, type ItemCategory } from "./constants";
import { fetchCDragonTftData, fetchLatestPatchVersion, mapWithConcurrency, resolveIconUrl, stripHtmlTags } from "./ingest";
import type { getSupabaseServerClient } from "./supabase";

export interface ParsedItem {
  apiName: string;
  name: string;
  officialDesc: string;
  iconPath: string;
  category: ItemCategory;
}

export interface ItemIngestResult {
  patchVersion: string;
  setNumber: number;
  fetchedAt: string;
  items: ParsedItem[];
  warnings: string[];
  /** 분류를 못해 제외된 아이템 (data/item-category-overrides.json에 직접 채울 수 있도록) */
  unresolvedForOverride: Array<{ apiName: string; name: string }>;
  /** items가 0개이거나 아주 적을 때만 채워지는 진단 정보 */
  debug?: {
    topLevelKeys: string[];
    itemsArrayLength: number;
    tftItemPrefixedCount: number;
    excludedBaseComponentCount: number;
    sampleTftItems: unknown[];
    categoryUnresolvedSample?: { apiName: string; raw: unknown };
  };
}

// 완성된 아이템인지(조합 재료 2개로 만들어짐) 판단하기 위해 후보 필드 이름을
// 여러 개 확인합니다. 실제 필드명이 다르면 여기 목록에 추가하세요.
function readComposition(raw: Record<string, unknown>): unknown[] | null {
  const candidate = raw.composition ?? raw.from ?? raw.recipe;
  return Array.isArray(candidate) ? candidate : null;
}

/**
 * "normal" | "artifact" | "radiant" 중 하나로 분류하거나, 티어리스트 대상이
 * 아닌 기본 조합 재료(컴포넌트)면 "exclude", 그것도 아니면 애매해서 사람이
 * 직접 채워야 하는 null을 반환한다.
 */
function guessCategory(raw: Record<string, unknown>): ItemCategory | "exclude" | null {
  const apiName = raw.apiName as string;

  if (/radiant/i.test(apiName)) return "radiant";
  if (/artifact/i.test(apiName)) return "artifact";

  const composition = readComposition(raw);
  if (composition && composition.length >= 2) return "normal";
  if (composition && composition.length === 0) return "exclude";

  return null;
}

export async function fetchAndParseItems(options?: {
  setNumber?: number;
  // rarity-overrides.json과 같은 이유로 string으로 느슨하게 받고 isItemCategory()로 검증합니다.
  categoryOverrides?: Record<string, string>;
}): Promise<ItemIngestResult> {
  const setNumber = options?.setNumber ?? CURRENT_SET_NUMBER;
  const categoryOverrides = options?.categoryOverrides ?? {};
  const warnings: string[] = [];

  const data = await fetchCDragonTftData();
  const itemsArray = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];

  const tftItems = itemsArray.filter(
    (raw) => typeof raw.apiName === "string" && (raw.apiName as string).startsWith("TFT_Item_")
  );

  const parsed: ParsedItem[] = [];
  const unresolvedForOverride: Array<{ apiName: string; name: string }> = [];
  let excludedBaseComponentCount = 0;
  let categoryUnresolvedSample: { apiName: string; raw: unknown } | undefined;

  for (const raw of tftItems) {
    const apiName = raw.apiName as string;
    const name = typeof raw.name === "string" ? raw.name : apiName;
    const overrideValue = categoryOverrides[apiName];
    if (overrideValue !== undefined && !isItemCategory(overrideValue)) {
      warnings.push(
        `data/item-category-overrides.json의 "${apiName}" 값("${overrideValue}")이 normal/artifact/radiant 중 하나가 아니라 무시합니다.`
      );
    }

    const guessed = guessCategory(raw);
    if (guessed === "exclude") {
      excludedBaseComponentCount += 1;
      continue;
    }

    const category = guessed ?? (isItemCategory(overrideValue) ? overrideValue : null);
    if (!category) {
      warnings.push(`분류를 판별할 수 없어 건너뜀: ${apiName}`);
      unresolvedForOverride.push({ apiName, name });
      if (!categoryUnresolvedSample) categoryUnresolvedSample = { apiName, raw };
      continue;
    }

    parsed.push({
      apiName,
      name,
      officialDesc: stripHtmlTags(typeof raw.desc === "string" ? raw.desc : ""),
      iconPath: typeof raw.icon === "string" ? raw.icon : "",
      category,
    });
  }

  let debug: ItemIngestResult["debug"] | undefined;
  if (parsed.length === 0 || categoryUnresolvedSample) {
    debug = {
      topLevelKeys: Object.keys(data),
      itemsArrayLength: itemsArray.length,
      tftItemPrefixedCount: tftItems.length,
      excludedBaseComponentCount,
      sampleTftItems: tftItems.slice(0, 5),
      categoryUnresolvedSample,
    };
  }

  const patchVersion = await fetchLatestPatchVersion();

  return {
    patchVersion,
    setNumber,
    fetchedAt: new Date().toISOString(),
    items: parsed,
    warnings,
    unresolvedForOverride,
    debug,
  };
}

export interface ItemUpsertSummary {
  total: number;
  byCategory: Record<ItemCategory, number>;
  iconsResolved: number;
  iconsMissing: number;
  warnings: string[];
}

export async function upsertItems(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  result: ItemIngestResult
): Promise<ItemUpsertSummary> {
  const withIcons = await mapWithConcurrency(result.items, 8, async (item) => {
    const iconUrl = await resolveIconUrl(item.iconPath);
    return { item, iconUrl };
  });

  const warnings = [...result.warnings];

  const rows = withIcons.map(({ item, iconUrl }) => ({
    api_name: item.apiName,
    name: item.name,
    icon_url: iconUrl,
    official_desc: item.officialDesc,
    category: item.category,
    set_number: result.setNumber,
    patch_version: result.patchVersion,
  }));

  let iconsMissing = 0;
  for (const { item, iconUrl } of withIcons) {
    if (!iconUrl) {
      iconsMissing += 1;
      warnings.push(`아이콘 URL을 찾지 못함: ${item.apiName} (icon="${item.iconPath}")`);
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("items").upsert(rows, { onConflict: "api_name" });
    if (error) throw new Error(`DB upsert 실패: ${error.message}`);
  }

  const byCategory: Record<ItemCategory, number> = { normal: 0, artifact: 0, radiant: 0 };
  for (const row of rows) {
    byCategory[row.category as ItemCategory] += 1;
  }

  return {
    total: rows.length,
    byCategory,
    iconsResolved: rows.length - iconsMissing,
    iconsMissing,
    warnings,
  };
}
