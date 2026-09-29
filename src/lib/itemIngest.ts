// 아이템(일반/유물/찬란/상징) 데이터 수집 로직. src/lib/ingest.ts(증강체 ingest)와
// 같은 Community Dragon ko_kr.json의 data.items 배열을 공유해서 읽습니다
// (실측 확인: 증강체도 apiName이 "DA_"로 시작하는 data.items 항목이라, 실제
// 아이템은 같은 배열에서 apiName이 "TFT_Item_"류 접두어로 시작하는 항목들입니다.
// 세트마다 "TFT9_Item_" 처럼 세트 번호가 붙는 경우도 있어 정규식으로 잡습니다).
//
// 주의: 이 파일도 증강체 ingest.ts와 마찬가지로 이 샌드박스 환경에서는
// raw.communitydragon.org 접근이 막혀 있어 실제 응답으로 검증하지 못했습니다.
// 일반/유물/찬란/상징 구분은 apiName에 "Radiant"/"Artifact"/"Emblem"이
// 들어있는지로만 최선의 추정을 하고, 나머지는 전부 "일반"으로 분류합니다
// (조합 재료 개수로 완성품 여부를 걸러내려던 이전 로직은 실제 필드명을
// 확인하지 못한 채 항목을 통째로 누락시키는 부작용이 있어 제거했습니다 —
// 이제는 놓치는 것보다 잘못 분류된 항목이 섞이는 쪽이 낫고, 후자는 아이템
// 상세 모달의 삭제 버튼으로 사용자가 직접 정리할 수 있습니다). 분류가
// 틀렸거나 npm run fetch:items 실행 시 파싱된 아이템 수가 이상하면, 콘솔에
// 출력되는 "--- 진단 정보 ---" 블록을 보고 이 파일의 guessCategory() 근처를
// 조정하세요.

import { CURRENT_SET_NUMBER, isItemCategory, type ItemCategory } from "./constants";
import { fetchCDragonTftData, fetchLatestPatchVersion, mapWithConcurrency, resolveIconUrl, stripHtmlTags } from "./ingest";
import type { getSupabaseServerClient } from "./supabase";

const TFT_ITEM_API_NAME = /^TFT\d*_Item_/;

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
  /** items가 0개일 때만 채워지는 진단 정보 */
  debug?: {
    topLevelKeys: string[];
    itemsArrayLength: number;
    tftItemPrefixedCount: number;
    sampleTftItems: unknown[];
  };
}

/** "normal" | "artifact" | "radiant" | "trait" 중 하나로 분류한다 (항상 값을 반환). */
function guessCategory(raw: Record<string, unknown>): ItemCategory {
  const apiName = raw.apiName as string;

  if (/radiant/i.test(apiName)) return "radiant";
  if (/emblem/i.test(apiName)) return "trait";
  if (/artifact/i.test(apiName)) return "artifact";

  return "normal";
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
    (raw) => typeof raw.apiName === "string" && TFT_ITEM_API_NAME.test(raw.apiName as string)
  );

  const parsed: ParsedItem[] = [];
  // guessCategory()가 이제 항상 값을 반환하기 때문에 실질적으로 채워지지
  // 않지만, 향후 다시 애매한 경우를 걸러야 할 때를 위해 시그니처는 유지합니다.
  const unresolvedForOverride: Array<{ apiName: string; name: string }> = [];

  for (const raw of tftItems) {
    const apiName = raw.apiName as string;
    const name = typeof raw.name === "string" ? raw.name : apiName;
    const overrideValue = categoryOverrides[apiName];
    if (overrideValue !== undefined && !isItemCategory(overrideValue)) {
      warnings.push(
        `data/item-category-overrides.json의 "${apiName}" 값("${overrideValue}")이 normal/artifact/radiant/trait 중 하나가 아니라 무시합니다.`
      );
    }

    const category = isItemCategory(overrideValue) ? overrideValue : guessCategory(raw);

    parsed.push({
      apiName,
      name,
      officialDesc: stripHtmlTags(typeof raw.desc === "string" ? raw.desc : ""),
      iconPath: typeof raw.icon === "string" ? raw.icon : "",
      category,
    });
  }

  let debug: ItemIngestResult["debug"] | undefined;
  if (parsed.length === 0) {
    debug = {
      topLevelKeys: Object.keys(data),
      itemsArrayLength: itemsArray.length,
      tftItemPrefixedCount: tftItems.length,
      sampleTftItems: tftItems.slice(0, 5),
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

  const byCategory: Record<ItemCategory, number> = { normal: 0, artifact: 0, radiant: 0, trait: 0 };
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
