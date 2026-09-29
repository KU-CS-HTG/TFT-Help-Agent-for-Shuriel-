// 아이템(일반/유물/찬란/상징) 데이터 수집 로직. src/lib/ingest.ts(증강체 ingest)와
// 같은 Community Dragon ko_kr.json의 data.items 배열을 공유해서 읽습니다.
//
// 실측 확인(사용자가 npm run fetch:items를 로컬에서 돌려 확인해줌, 2026-09):
// - 일반/유물/찬란 아이템은 "TFT_Item_..." / "TFT<세트번호>_Item_..." 형태의
//   에버그린(세트 무관, 매 시즌 재사용) apiName을 씁니다.
// - 반면 특성 상징(Emblem)은 시즌마다 통째로 갈아엎이는 특성 이름을 그대로
//   아이템화한 거라 세트마다 새로 나오고, apiName도 완전히 다른 규칙을
//   씁니다: 이번 세트(18)는 "DA_18_Emblem<특성이름>"(증강체와 같은 "DA_"
//   네임스페이스) 형태고, 과거 세트들은 "TFT<세트번호>_Item_...EmblemItem"
//   / "TFT<세트번호>_Augment_...Emblem"(세트 7의 왕관/문장류 증강체) 등
//   제각각입니다. CDragon의 data.items 배열에는 지금 세트뿐 아니라 3, 7,
//   13~17 등 모든 과거 세트의 상징이 전부 같이 들어있어서, "apiName에
//   Emblem이 들어가면 상징"이라는 규칙만으로는 이번 시즌에 안 쓰는 상징
//   수십 개가 같이 섞여 들어옵니다(실측: 133개 중 대부분이 과거 세트).
//   그래서 상징만은 apiName에 박힌 세트 번호가 CURRENT_SET_NUMBER와 같거나
//   아예 세트 번호가 없는 것만 인정합니다 (isCurrentOrSetlessEmblem 참고).
// - "TFT7_Augment_XXXEmblem" 류는 실제로는 증강체(다른 인제스트 경로에서
//   이미 "DA_" 접두어 기준으로 따로 처리됨)라서 "_Augment_"가 들어간
//   apiName은 상징 후보에서 제외합니다.
//
// 분류가 다시 이상해지거나 npm run fetch:items 실행 시 파싱된 아이템 수가
// 이상하면, 콘솔에 출력되는 상징 목록 / "--- 진단 정보 ---" 블록을 보고 이
// 파일의 guessCategory() / isCurrentOrSetlessEmblem() 근처를 조정하세요.

import { CURRENT_SET_NUMBER, isItemCategory, type ItemCategory } from "./constants";
import { fetchCDragonTftData, fetchLatestPatchVersion, mapWithConcurrency, resolveIconUrl, stripHtmlTags } from "./ingest";
import type { getSupabaseServerClient } from "./supabase";

const TFT_ITEM_API_NAME = /^TFT\d*_Item_/;

/** apiName에 "Emblem"이 들어가지만, 세트 7의 왕관/문장류 증강체(TFT7_Augment_*Emblem*)는 아이템이 아니라서 제외한다. */
function isEmblemApiName(apiName: string): boolean {
  return /emblem/i.test(apiName) && !/_augment_/i.test(apiName);
}

/** apiName에 박힌 숫자들(대체로 세트 번호)을 뽑는다. 예: "DA_18_EmblemLunar" → [18]. */
function extractSetNumbers(apiName: string): number[] {
  return (apiName.match(/\d+/g) ?? []).map(Number);
}

/**
 * 상징류 apiName이 "이번 세트" 것인지 판단한다. apiName에 세트 번호가 아예
 * 없으면(드묾) 세트 무관으로 보고 통과시키고, 있으면 그 번호들 중 하나라도
 * 현재 세트와 일치해야 통과한다. 다른 세트 번호만 박혀 있으면(예:
 * "TFT15_Item_ShotcallerEmblemItem") 지금 시즌에 쓰이지 않는 옛날 상징으로
 * 보고 제외한다.
 */
function isCurrentOrSetlessEmblem(apiName: string, currentSet: number): boolean {
  const nums = extractSetNumbers(apiName);
  return nums.length === 0 || nums.includes(currentSet);
}

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
  /**
   * apiName 또는 name에 "emblem"/"상징"이 들어있지만 최종 후보 목록에는 안
   * 들어간 항목들. 다른 세트 상징(의도적 제외)과 왕관/문장류 증강체는 이미
   * 걸러내고 남은 것만 들어있어서, 평소엔 비어 있는 게 정상이다 — 여기에
   * 뭔가 뜨면 새로운 예외 케이스가 생긴 것이니 확인이 필요하다.
   */
  emblemLikeOutsideFilter: Array<{ apiName: string; name: string }>;
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

  function isItemCandidate(apiName: string): boolean {
    if (isEmblemApiName(apiName)) return isCurrentOrSetlessEmblem(apiName, setNumber);
    return TFT_ITEM_API_NAME.test(apiName);
  }

  const tftItems = itemsArray.filter((raw) => typeof raw.apiName === "string" && isItemCandidate(raw.apiName));

  // 상징류인데 위 규칙으로도 못 걸러진(제외되지도, 포함되지도 않은 애매한)
  // 항목이 있는지 확인하는 진단용 — 다른 세트라서 "의도적으로 제외"된
  // 항목은 여기 안 뜨고, 그 외에 정말 이상한 케이스만 남는다.
  const tftItemApiNames = new Set(tftItems.map((raw) => raw.apiName as string));
  const emblemLikeOutsideFilter: Array<{ apiName: string; name: string }> = [];
  for (const raw of itemsArray) {
    const apiName = raw.apiName;
    if (typeof apiName !== "string" || tftItemApiNames.has(apiName)) continue;
    const name = typeof raw.name === "string" ? raw.name : "";
    const looksLikeEmblem = /emblem/i.test(apiName) || /emblem/i.test(name) || name.includes("상징");
    if (!looksLikeEmblem) continue;
    if (isEmblemApiName(apiName) && !isCurrentOrSetlessEmblem(apiName, setNumber)) continue; // 다른 세트 상징 — 의도적 제외
    if (/_augment_/i.test(apiName)) continue; // 세트 7 왕관/문장류 증강체 — 아이템이 아님
    emblemLikeOutsideFilter.push({ apiName, name: name || apiName });
  }

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
    emblemLikeOutsideFilter,
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
