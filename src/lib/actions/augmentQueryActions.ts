"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import type { Stage } from "@/lib/constants";
import type { Augment, AugmentImage, AugmentNote, AugmentWithExtras, TierPlacement } from "@/lib/types";

/**
 * 증강체 하나를 특정 스테이지 컨텍스트로 완전히 조립해서 가져온다.
 * "증강체 추가" 패널에서 stages를 갱신한 직후, 그 보드에 바로 표시할 수
 * 있도록 전체 데이터(메모/이미지/그 스테이지의 티어 배치)를 채워준다.
 */
export async function fetchAugmentForStage(augmentId: string, stage: Stage): Promise<AugmentWithExtras> {
  const supabase = getSupabaseServerClient();

  const [augmentRes, placementRes, noteRes, imagesRes] = await Promise.all([
    supabase.from("augments").select("*").eq("id", augmentId).single(),
    supabase.from("tier_placements").select("*").eq("stage", stage).eq("augment_id", augmentId).maybeSingle(),
    supabase.from("augment_notes").select("*").eq("augment_id", augmentId).maybeSingle(),
    supabase.from("augment_images").select("*").eq("augment_id", augmentId).order("position"),
  ]);

  if (augmentRes.error) throw new Error(augmentRes.error.message);
  if (placementRes.error) throw new Error(placementRes.error.message);
  if (noteRes.error) throw new Error(noteRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);

  return {
    ...(augmentRes.data as Augment),
    placement: (placementRes.data as TierPlacement | null) ?? null,
    note: (noteRes.data as AugmentNote | null) ?? null,
    images: (imagesRes.data as AugmentImage[]) ?? [],
  };
}
