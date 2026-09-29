"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ItemTier } from "@/lib/constants";

export async function updateItemPlacementAction(itemId: string, tier: ItemTier | null) {
  const supabase = getSupabaseServerClient();

  if (tier === null) {
    const { error } = await supabase.from("item_tier_placements").delete().eq("item_id", itemId);
    if (error) throw new Error(error.message);
  } else {
    const { data: existing, error: readError } = await supabase
      .from("item_tier_placements")
      .select("position")
      .eq("tier", tier)
      .order("position", { ascending: false })
      .limit(1);
    if (readError) throw new Error(readError.message);

    const rows = existing as Array<{ position: number }> | null;
    const nextPosition = (rows?.[0]?.position ?? -1) + 1;

    const { error } = await supabase
      .from("item_tier_placements")
      .upsert({ item_id: itemId, tier, position: nextPosition }, { onConflict: "item_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/items");
}
