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
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// CDragon 필드명은 패치/버전마다 조금씩 달라질 수 있어 여러 후보를 순서대로 시도합니다.
function guessRarity(raw: Record<string, unknown>): Rarity | null {
  const tierField = raw.tier ?? raw.rarity ?? raw.augmentTier;

  if (typeof tierField === "number") {
    if (tierField === 1) return "silver";
    if (tierField === 2) return "gold";
    if (tierField === 3) return "prism";
  }

  if (typeof tierField === "string") {
    const lower = tierField.toLowerCase();
    if (lower.includes("silver") || lower === "1") return "silver";
    if (lower.includes("gold") || lower === "2") return "gold";
    if (lower.includes("prism") || lower === "3") return "prism";
  }

  const apiName = typeof raw.apiName === "string" ? raw.apiName : "";
  const icon = typeof raw.icon === "string" ? raw.icon : "";
  const haystack = `${apiName} ${icon}`.toLowerCase();

  if (haystack.includes("prismatic") || haystack.includes("prism")) return "prism";
  if (haystack.includes("gold")) return "gold";
  if (haystack.includes("silver")) return "silver";
  if (haystack.includes("tier3")) return "prism";
  if (haystack.includes("tier2")) return "gold";
  if (haystack.includes("tier1")) return "silver";

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

export async function fetchAndParseAugments(options?: { setNumber?: number }): Promise<IngestResult> {
  const setNumber = options?.setNumber ?? CURRENT_SET_NUMBER;
  const warnings: string[] = [];

  const res = await fetch(CDRAGON_JSON_URL);
  if (!res.ok) {
    throw new Error(`Community Dragon 데이터를 가져오지 못했습니다 (HTTP ${res.status}).`);
  }
  const data = (await res.json()) as Record<string, unknown>;

  const setDataArray = (data.setData ?? data.sets ?? []) as Array<Record<string, unknown>>;
  const matchingSets = setDataArray.filter((s) => {
    const mutator = typeof s.mutator === "string" ? s.mutator : "";
    const num = s.number ?? mutator.match(/\d+/)?.[0];
    return Number(num) === setNumber;
  });

  if (matchingSets.length === 0) {
    warnings.push(
      `setData 안에서 number=${setNumber} 인 세트를 찾지 못했습니다 (전체 세트 개수: ${setDataArray.length}). ` +
        `data.setData[*].number 필드명이 바뀌었을 수 있으니 응답 구조를 확인하세요.`
    );
  }

  const rawAugments = new Map<string, Record<string, unknown>>();
  for (const set of matchingSets) {
    const list = (set.augments ?? set.augmentsList ?? []) as Array<Record<string, unknown>>;
    for (const aug of list) {
      const apiName = aug?.apiName;
      if (typeof apiName !== "string") continue;
      rawAugments.set(apiName, aug);
    }
  }

  // setData 경로로 못 찾으면 최상위 augments 배열도 시도 (CDragon 버전별 대응)
  if (rawAugments.size === 0 && Array.isArray(data.augments)) {
    for (const aug of data.augments as Array<Record<string, unknown>>) {
      const apiName = aug?.apiName;
      if (typeof apiName !== "string") continue;
      rawAugments.set(apiName, aug);
    }
    warnings.push("setData에서 못 찾아 최상위 augments 배열을 대신 사용했습니다 (세트 필터링 미적용).");
  }

  const parsed: ParsedAugment[] = [];
  for (const raw of rawAugments.values()) {
    const rarity = guessRarity(raw);
    const apiName = raw.apiName as string;
    if (!rarity) {
      warnings.push(`등급을 판별할 수 없어 건너뜀: ${apiName}`);
      continue;
    }
    parsed.push({
      apiName,
      name: typeof raw.name === "string" ? raw.name : apiName,
      descriptionGame: stripHtmlTags(typeof raw.desc === "string" ? raw.desc : ""),
      iconPath: typeof raw.icon === "string" ? raw.icon : "",
      rarity,
    });
  }

  const patchVersion = await fetchLatestPatchVersion();

  return {
    patchVersion,
    setNumber,
    fetchedAt: new Date().toISOString(),
    augments: parsed,
    warnings,
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

  const rows = withIcons.map(({ augment, iconUrl }) => ({
    api_name: augment.apiName,
    name: augment.name,
    description_game: augment.descriptionGame,
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
