"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchAndParseAugments, upsertAugments, type UpsertSummary } from "@/lib/ingest";
import { STAGES, type Rarity } from "@/lib/constants";
import rarityOverridesFile from "../../../data/rarity-overrides.json";

// data/rarity-overrides.json은 npm run fetch:augments(CLI)를 로컬에서 돌릴 때
// 자동으로 채워지고 커밋됩니다. 이 서버 액션은 배포 환경에서도 안전하게
// 동작해야 해서(fs 런타임 읽기는 서버리스에서 보장되지 않음) 정적 import로
// 빌드에 포함시켜 읽기 전용으로만 사용합니다 — 여기서는 파일을 쓰지 않습니다.
const rarityOverrides: Record<string, Rarity> = Object.fromEntries(
  Object.entries(rarityOverridesFile.entries as Record<string, { name: string; rarity: Rarity | null }>)
    .filter(([, entry]) => entry.rarity !== null)
    .map(([apiName, entry]) => [apiName, entry.rarity as Rarity])
);

export async function refreshDataAction(): Promise<UpsertSummary> {
  const result = await fetchAndParseAugments({ rarityOverrides });
  const supabase = getSupabaseServerClient();
  const summary = await upsertAugments(supabase, result);

  for (const stage of STAGES) {
    revalidatePath(`/${stage}`);
  }

  return summary;
}
