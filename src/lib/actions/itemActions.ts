"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ItemCategory } from "@/lib/constants";
import type { Item } from "@/lib/types";

/** 여러 아이템을 한 번에 지운다 (item_tier_placements/item_notes는 on delete cascade로 정리됨). */
export async function deleteItemsAction(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("items").delete().in("id", itemIds);
  if (error) throw new Error(error.message);

  revalidatePath("/items");
}

/** 중복/오분류로 잘못 들어온 아이템 하나를 사용자가 직접 지울 수 있게 하는 액션. */
export async function deleteItemAction(itemId: string): Promise<void> {
  return deleteItemsAction([itemId]);
}

/**
 * 자동 분류가 틀린 아이템을 다른 카테고리로 옮긴다. 카테고리별 티어보드는
 * 서로 독립적이라 기존 티어 배치를 그대로 들고 가면 새 보드에서 사용자가
 * 배치하지 않은 티어에 이미 올라가 있는 것처럼 보이므로, 옮길 때 기존
 * 배치는 지우고 "미분류"로 되돌린다.
 */
export async function updateItemCategoryAction(itemId: string, category: ItemCategory): Promise<Item> {
  const supabase = getSupabaseServerClient();

  const { error: placementError } = await supabase.from("item_tier_placements").delete().eq("item_id", itemId);
  if (placementError) throw new Error(placementError.message);

  const { data, error } = await supabase.from("items").update({ category }).eq("id", itemId).select().single();
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  return data as Item;
}
