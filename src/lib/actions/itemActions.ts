"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";

/** 중복/오분류로 잘못 들어온 아이템을 사용자가 직접 지울 수 있게 하는 액션.
 * item_tier_placements/item_notes는 on delete cascade로 함께 정리된다. */
export async function deleteItemAction(itemId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/items");
}
