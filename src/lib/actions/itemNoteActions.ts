"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ItemNote } from "@/lib/types";

export async function updateItemNoteAction(itemId: string, content: string): Promise<ItemNote> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("item_notes")
    .upsert({ item_id: itemId, content }, { onConflict: "item_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  return data as ItemNote;
}
