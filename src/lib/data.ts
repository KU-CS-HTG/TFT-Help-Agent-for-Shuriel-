import "server-only";
import { getSupabaseServerClient } from "./supabase";
import type { Stage } from "./constants";
import type { Augment, AugmentImage, AugmentNote, AugmentWithExtras, TierPlacement } from "./types";

export async function getStageBoardData(stage: Stage): Promise<AugmentWithExtras[]> {
  const supabase = getSupabaseServerClient();

  const { data: augments, error } = await supabase
    .from("augments")
    .select("*")
    .eq("stage", stage)
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
