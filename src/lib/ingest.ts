// Community Dragon TFT 데이터 수집 로직.
// CLI 스크립트(scripts/fetch-augments.ts)와 "패치 데이터 새로고침" 서버
// 액션(src/lib/actions/refreshActions.ts) 양쪽에서 공유합니다.
//
// 주의: 이 파일이 작성된 샌드박스 환경은 조직 네트워크 정책으로
// raw.communitydragon.org 접근이 차단되어 있어, 아래 파싱 로직을 실제
// 응답으로 검증하지 못했습니다. 필드명이 다르면 guessRarity() 근처의
// 후보 목록을 조정하세요. 자세한 내용은 SETUP.md 참고.

import { CURRENT_SET_NUMBER, RARITY_TO_STAGE, type Rarity } from "./constants";
import type { getSupabaseServerClient } from "./supabase";

const CDRAGON_JSON_URL = "https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json";
const CDRAGON_GAME_ASSET_BASE = "https://raw.communitydragon.org/latest/game/";
const CDRAGON_METADATA_URL = "https://raw.communitydragon.org/latest/content-metadata.json";

export interface ParsedAugment {
  apiName: string;
  name: string;
  descriptionGame: string;
  iconPath: string;
  rarity: Rarity;
}

export interface IngestResult {
  patchVersion: string;
  setNumber: number;
  fetchedAt: string;
  augments: ParsedAugment[];
  warnings: string[];
  /** 등급을 못 찾아 제외된 증강체 (data/rarity-overrides.json에 직접 채워 넣을 수 있도록) */
  unresolvedForOverride: Array<{ apiName: string; name: string }>;
  /** augments가 0개일 때만 채워지는 진단 정보 (실제 CDragon 응답 구조 파악용) */
  debug?: {
    topLevelKeys: string[];
    setCount: number;
    sets: Array<{ number: unknown; mutator: unknown; keys: string[] }>;
    firstMatchingSetKeys?: string[];
    augmentsListLength?: number;
    firstAugmentSample?: unknown;
    itemsArrayLength?: number;
    firstReferencedApiName?: string | null;
    firstItemSample?: unknown;
    excludedNonDaCount?: number;
    rarityUnresolvedSample?: { apiName: string; raw: unknown };
    raritySuccessSample?: { apiName: string; raw: unknown; rarity: Rarity };
  };
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// CDragon ko_kr.json의 augment 항목(data.items에서 찾아온 객체)에는 등급
// (실버/골드/프리즘)을 나타내는 명시적 필드가 없는 것으로 실측 확인됨 —
// apiName/icon에 "gold"/"silver" 같은 문자열이 들어있어도 그건 아이콘
// 이름일 뿐 등급과 무관함(예: "golden-gifts-iii.tex" 아이콘은 실제로는
// 등급 정보가 아니라 아이콘 테마 이름). 그래서 문자열 추측은 하지 않고,
// (혹시 나중에 필드가 추가될 경우를 위해) 명시적 tier/rarity 필드만 확인한
// 뒤, 없으면 rarityOverrides(사람이 직접 채운 값)로 넘어갑니다.
function guessRarity(raw: Record<string, unknown>): Rarity | null {
  const tierField = raw.tier ?? raw.rarity ?? raw.augmentTier;

  if (typeof tierField === "number") {
    if (tierField === 1) return "silver";
    if (tierField === 2) return "gold";
    if (tierField === 3) return "prism";
  }

  if (typeof tierField === "string") {
    const lower = tierField.toLowerCase();
    if (lower === "silver" || lower === "1") return "silver";
    if (lower === "gold" || lower === "2") return "gold";
    if (lower === "prism" || lower === "prismatic" || lower === "3") return "prism";
  }

  return null;
}

function toIconUrlCandidates(iconPath: string): string[] {
  const lower = iconPath.toLowerCase();
  const withPng = lower.replace(/\.(dds|tex|png)$/i, ".png");
  const candidates = new Set([withPng, lower]);
  return [...candidates].map((path) => `${CDRAGON_GAME_ASSET_BASE}${path}`);
}

export async function resolveIconUrl(iconPath: string): Promise<string | null> {
  if (!iconPath) return null;
  for (const candidate of toIconUrlCandidates(iconPath)) {
    try {
      const res = await fetch(candidate, { method: "HEAD" });
      if (res.ok) return candidate;
    } catch {
      // 다음 후보 시도
    }
  }
  return null;
}

export async function fetchLatestPatchVersion(): Promise<string> {
  try {
    const res = await fetch(CDRAGON_METADATA_URL);
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { version?: string };
    return data.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function fetchAndParseAugments(options?: {
  setNumber?: number;
  rarityOverrides?: Record<string, Rarity>;
}): Promise<IngestResult> {
  const setNumber = options?.setNumber ?? CURRENT_SET_NUMBER;
  const rarityOverrides = options?.rarityOverrides ?? {};
  const warnings: string[] = [];

  const res = await fetch(CDRAGON_JSON_URL);
  if (!res.ok) {
    throw new Error(`Community Dragon 데이터를 가져오지 못했습니다 (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as Record<string, unknown>;

  const setDataArray = (data.setData ?? data.sets ?? []) as Array<Record<string, unknown>>;

  // 세트 번호를 여러 후보 필드에서 시도 (버전마다 위치가 다를 수 있음)
  function readSetNumber(s: Record<string, unknown>): number | null {
    const mutator = typeof s.mutator === "string" ? s.mutator : "";
    const candidates = [s.number, s.set, mutator.match(/\d+/)?.[0]];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  const matchingSets = setDataArray.filter((s) => readSetNumber(s) === setNumber);

  let debug: IngestResult["debug"] | undefined;

  if (matchingSets.length === 0) {
    warnings.push(
      `setData 안에서 number=${setNumber} 인 세트를 찾지 못했습니다 (전체 세트 개수: ${setDataArray.length}). ` +
        `data.setData[*].number 필드명이 바뀌었을 수 있으니 응답 구조를 확인하세요.`
    );
    debug = {
      topLevelKeys: Object.keys(data),
      setCount: setDataArray.length,
      sets: setDataArray.map((s) => ({
        number: s.number,
        mutator: s.mutator,
        keys: Object.keys(s),
      })),
    };
  }

  // set.augments는 객체 배열이 아니라 apiName 문자열 배열인 경우가 있다
  // (실측: TFTSet18의 augments가 ["DA_18_BigGrabBag", ...] 형태). 그 경우
  // 실제 이름/설명/아이콘을 가진 객체는 최상위 data.items 배열에 있고,
  // apiName으로 대조해서 찾아와야 한다.
  const referencedApiNames = new Set<string>();
  const rawAugments = new Map<string, Record<string, unknown>>();
  let combinedRawList: unknown[] = [];

  for (const set of matchingSets) {
    const list = (set.augments ?? set.augmentsList ?? set.augmentList ?? []) as unknown[];
    combinedRawList = combinedRawList.concat(list);
    for (const entry of list) {
      if (typeof entry === "string") {
        referencedApiNames.add(entry);
      } else if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        if (typeof obj.apiName === "string") {
          referencedApiNames.add(obj.apiName);
          // 이미 완전한 증강체 객체라면(desc/icon 보유) 바로 사용
          if (typeof obj.desc === "string" || typeof obj.icon === "string") {
            rawAugments.set(obj.apiName, obj);
          }
        }
      }
    }
  }

  // TFTSet18의 augments 목록에는 구식 네이밍(TFT_Augment_*, TFT6_Augment_*,
  // TFT9_Augment_Commander_* 등)의 레거시/비활성 증강체가 대량으로 섞여
  // 나온다. 실측 결과 현재 활성 증강체는 전부 "DA_"로 시작하는 새 네이밍
  // (DA_18_전용 또는 세트 번호 없는 범용 DA_*)을 쓰고 있어, 그 외
  // 접두사는 전부 제외한다. 단, "DA_URF"처럼 URF 등 특수 모드 전용인
  // DA_ 접두사 항목은 이 규칙만으로는 걸러지지 않는다.
  let excludedNonDaCount = 0;
  for (const apiName of [...referencedApiNames]) {
    if (!apiName.startsWith("DA_")) {
      referencedApiNames.delete(apiName);
      excludedNonDaCount += 1;
    }
  }
  if (excludedNonDaCount > 0) {
    warnings.push(
      `"DA_"로 시작하지 않는(구식 네이밍) 증강체 ${excludedNonDaCount}개를 제외했습니다 (예: TFT_Augment_*, TFT6_Augment_* 등).`
    );
  }

  const itemsArray = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
  if (itemsArray.length > 0 && referencedApiNames.size > 0) {
    const itemsByApiName = new Map<string, Record<string, unknown>>();
    for (const item of itemsArray) {
      if (typeof item?.apiName === "string") itemsByApiName.set(item.apiName, item);
    }
    for (const apiName of referencedApiNames) {
      if (rawAugments.has(apiName)) continue;
      const item = itemsByApiName.get(apiName);
      if (item) rawAugments.set(apiName, item);
    }
  }

  if (matchingSets.length > 0 && rawAugments.size === 0) {
    warnings.push(
      `number=${setNumber} 세트에서 증강체 apiName은 ${referencedApiNames.size}개 찾았지만, ` +
        `data.items(${itemsArray.length}개)에서 매칭되는 객체를 찾지 못했습니다.`
    );
    debug = {
      topLevelKeys: Object.keys(data),
      setCount: setDataArray.length,
      sets: setDataArray.map((s) => ({
        number: s.number,
        mutator: s.mutator,
        keys: Object.keys(s),
      })),
      firstMatchingSetKeys: Object.keys(matchingSets[0]),
      augmentsListLength: combinedRawList.length,
      firstAugmentSample: combinedRawList[0] ?? null,
      itemsArrayLength: itemsArray.length,
      firstReferencedApiName: [...referencedApiNames][0] ?? null,
      firstItemSample: itemsArray[0] ?? null,
      excludedNonDaCount,
    };
  }

  // setData 경로로 못 찾으면 최상위 augments 배열도 시도 (CDragon 버전별 대응)
  if (rawAugments.size === 0 && Array.isArray(data.augments)) {
    for (const aug of data.augments as Array<Record<string, unknown>>) {
      const apiName = aug?.apiName;
      if (typeof apiName !== "string") continue;
      rawAugments.set(apiName, aug);
    }
    if (rawAugments.size > 0) {
      warnings.push("setData에서 못 찾아 최상위 augments 배열을 대신 사용했습니다 (세트 필터링 미적용).");
      debug = undefined;
    }
  }

  const parsed: ParsedAugment[] = [];
  const unresolvedForOverride: Array<{ apiName: string; name: string }> = [];
  let rarityUnresolvedSample: { apiName: string; raw: unknown } | undefined;
  let raritySuccessSample: { apiName: string; raw: unknown; rarity: Rarity } | undefined;

  for (const raw of rawAugments.values()) {
    const apiName = raw.apiName as string;
    const name = typeof raw.name === "string" ? raw.name : apiName;
    const rarity = guessRarity(raw) ?? rarityOverrides[apiName] ?? null;

    if (!rarity) {
      warnings.push(`등급을 판별할 수 없어 건너뜀: ${apiName}`);
      unresolvedForOverride.push({ apiName, name });
      // 세트 18 고유(DA_18_) 항목을 우선 샘플로 잡는다 — 범용 접두사보다
      // "진짜 이번 세트 증강체인데 등급을 못 찾은" 사례가 더 유용하다.
      if (!rarityUnresolvedSample || apiName.startsWith(`DA_${setNumber}_`)) {
        rarityUnresolvedSample = { apiName, raw };
      }
      continue;
    }
    if (!raritySuccessSample) {
      raritySuccessSample = { apiName, raw, rarity };
    }
    parsed.push({
      apiName,
      name,
      descriptionGame: stripHtmlTags(typeof raw.desc === "string" ? raw.desc : ""),
      iconPath: typeof raw.icon === "string" ? raw.icon : "",
      rarity,
    });
  }

  if (rarityUnresolvedSample || raritySuccessSample) {
    debug = {
      ...(debug ?? { topLevelKeys: Object.keys(data), setCount: setDataArray.length, sets: [] }),
      rarityUnresolvedSample,
      raritySuccessSample,
    };
  }

  const patchVersion = await fetchLatestPatchVersion();

  return {
    patchVersion,
    setNumber,
    fetchedAt: new Date().toISOString(),
    augments: parsed,
    warnings,
    unresolvedForOverride,
    debug,
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface UpsertSummary {
  total: number;
  bySilverGoldPrism: Record<Rarity, number>;
  iconsResolved: number;
  iconsMissing: number;
  warnings: string[];
}

export async function upsertAugments(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  result: IngestResult
): Promise<UpsertSummary> {
  const withIcons = await mapWithConcurrency(result.augments, 8, async (augment) => {
    const iconUrl = await resolveIconUrl(augment.iconPath);
    return { augment, iconUrl };
  });

  // 사용자가 "게임 내 설명"을 직접 수정한 증강체는 새로고침이 그 값을
  // 덮어쓰면 안 된다. description_game_overridden=true인 행들의 현재
  // description_game 값을 미리 읽어와서, 이번 upsert 페이로드에도 같은
  // 값을 그대로 넣어 사실상 변경 없이 유지되게 한다.
  const apiNames = withIcons.map(({ augment }) => augment.apiName);
  const overriddenDescriptions = new Map<string, string>();
  if (apiNames.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from("augments")
      .select("api_name, description_game, description_game_overridden")
      .in("api_name", apiNames);
    if (existingError) throw new Error(existingError.message);
    for (const row of existing ?? []) {
      const r = row as { api_name: string; description_game: string; description_game_overridden: boolean };
      if (r.description_game_overridden) overriddenDescriptions.set(r.api_name, r.description_game);
    }
  }

  const rows = withIcons.map(({ augment, iconUrl }) => ({
    api_name: augment.apiName,
    name: augment.name,
    description_game: overriddenDescriptions.get(augment.apiName) ?? augment.descriptionGame,
    icon_url: iconUrl,
    rarity: augment.rarity,
    stage: RARITY_TO_STAGE[augment.rarity],
    set_number: result.setNumber,
    patch_version: result.patchVersion,
  }));

  const warnings = [...result.warnings];
  let iconsMissing = 0;
  for (const { augment, iconUrl } of withIcons) {
    if (!iconUrl) {
      iconsMissing += 1;
      warnings.push(`아이콘 URL을 찾지 못함: ${augment.apiName} (icon="${augment.iconPath}")`);
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("augments").upsert(rows, { onConflict: "api_name" });
    if (error) {
      throw new Error(`DB upsert 실패: ${error.message}`);
    }
  }

  const bySilverGoldPrism: Record<Rarity, number> = { silver: 0, gold: 0, prism: 0 };
  for (const row of rows) {
    bySilverGoldPrism[row.rarity as Rarity] += 1;
  }

  return {
    total: rows.length,
    bySilverGoldPrism,
    iconsResolved: rows.length - iconsMissing,
    iconsMissing,
    warnings,
  };
}
