"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Item } from "@/lib/types";

export async function updateItemDescriptionAction(itemId: string, officialDesc: string): Promise<Item> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("items")
    .update({ official_desc: officialDesc, official_desc_overridden: true })
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  return data as Item;
}
