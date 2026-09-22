"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Stage, Tier } from "@/lib/constants";

export async function updatePlacementAction(augmentId: string, stage: Stage, tier: Tier | null) {
  const supabase = getSupabaseServerClient();

  if (tier === null) {
    const { error } = await supabase
      .from("tier_placements")
      .delete()
      .eq("augment_id", augmentId)
      .eq("stage", stage);
    if (error) throw new Error(error.message);
  } else {
    const { data: existing, error: readError } = await supabase
      .from("tier_placements")
      .select("position")
      .eq("stage", stage)
      .eq("tier", tier)
      .order("position", { ascending: false })
      .limit(1);
    if (readError) throw new Error(readError.message);

    const rows = existing as Array<{ position: number }> | null;
    const nextPosition = (rows?.[0]?.position ?? -1) + 1;

    const { error } = await supabase
      .from("tier_placements")
      .upsert(
        { augment_id: augmentId, stage, tier, position: nextPosition },
        { onConflict: "augment_id,stage" }
      );
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/${stage}`);
}
