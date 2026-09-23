import "server-only";
import { getSupabaseServerClient } from "./supabase";
import type { Stage } from "./constants";
import type { Augment, AugmentImage, AugmentNote, AugmentWithExtras, TierPlacement } from "./types";

export async function getStageBoardData(stage: Stage): Promise<AugmentWithExtras[]> {
  const supabase = getSupabaseServerClient();

  // stages 배열에 이 스테이지가 포함된 증강체만 가져온다. stages는 사용자가
  // 체크박스로 직접 관리하는 값이라(등급 기반 자동 배정 없음, 기본은 빈 배열)
  // 같은 증강체가 여러 스테이지 풀에 동시에 등장할 수도, 아무 데도 안 나타날
  // 수도 있다.
  const { data: augments, error } = await supabase
    .from("augments")
    .select("*")
    .contains("stages", [stage])
    .order("name");
  if (error) throw new Error(error.message);
  if (!augments || augments.length === 0) return [];

  const ids = (augments as Augment[]).map((a) => a.id);

  const [placementsRes, notesRes, imagesRes] = await Promise.all([
    supabase.from("tier_placements").select("*").eq("stage", stage).in("augment_id", ids),
    supabase.from("augment_notes").select("*").in("augment_id", ids),
    supabase.from("augment_images").select("*").in("augment_id", ids).order("position"),
  ]);

  if (placementsRes.error) throw new Error(placementsRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);

  const placementMap = new Map<string, TierPlacement>(
    ((placementsRes.data as TierPlacement[]) ?? []).map((p) => [p.augment_id, p])
  );
  const noteMap = new Map<string, AugmentNote>(
    ((notesRes.data as AugmentNote[]) ?? []).map((n) => [n.augment_id, n])
  );
  const imagesMap = new Map<string, AugmentImage[]>();
  for (const img of (imagesRes.data as AugmentImage[]) ?? []) {
    const list = imagesMap.get(img.augment_id) ?? [];
    list.push(img);
    imagesMap.set(img.augment_id, list);
  }

  return (augments as Augment[]).map((a) => ({
    ...a,
    placement: placementMap.get(a.id) ?? null,
    note: noteMap.get(a.id) ?? null,
    images: imagesMap.get(a.id) ?? [],
  }));
}

export interface AugmentLight {
  id: string;
  name: string;
  icon_url: string | null;
  stages: Stage[];
}

/**
 * 스테이지 배정과 무관하게 전체 증강체를 가볍게 가져온다. stages가 비어있는
 * (아직 어느 스테이지에도 체크 안 된) 증강체를 찾아서 추가할 수 있게 하는
 * "증강체 추가" 검색 패널용 — 이게 없으면 stages가 빈 증강체는 어느 보드에도
 * 안 보여서 체크할 방법이 없다.
 */
export async function getAllAugmentsLight(): Promise<AugmentLight[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("augments")
    .select("id, name, icon_url, stages")
    .order("name");
  if (error) throw new Error(error.message);

  return (data ?? []) as AugmentLight[];
}
