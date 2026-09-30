"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function addRecommendedAugmentAction(deckId: string, augmentId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("deck_recommended_augments")
    .select("position")
    .eq("deck_id", deckId)
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const rows = existing as Array<{ position: number }> | null;
  const nextPosition = (rows?.[0]?.position ?? -1) + 1;

  const { error } = await supabase
    .from("deck_recommended_augments")
    .upsert({ deck_id: deckId, augment_id: augmentId, position: nextPosition }, { onConflict: "deck_id,augment_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}

export async function removeRecommendedAugmentAction(deckId: string, augmentId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("deck_recommended_augments")
    .delete()
    .eq("deck_id", deckId)
    .eq("augment_id", augmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}

export async function addRecommendedItemAction(deckId: string, itemId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("deck_recommended_items")
    .select("position")
    .eq("deck_id", deckId)
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const rows = existing as Array<{ position: number }> | null;
  const nextPosition = (rows?.[0]?.position ?? -1) + 1;

  const { error } = await supabase
    .from("deck_recommended_items")
    .upsert({ deck_id: deckId, item_id: itemId, position: nextPosition }, { onConflict: "deck_id,item_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}

export async function removeRecommendedItemAction(deckId: string, itemId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("deck_recommended_items")
    .delete()
    .eq("deck_id", deckId)
    .eq("item_id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}
