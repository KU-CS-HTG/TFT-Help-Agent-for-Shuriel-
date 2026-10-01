"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Deck } from "@/lib/types";

const BUCKET = "augment-images";

export async function createDeckAction(name: string): Promise<Deck> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("덱 이름을 입력하세요.");

  const supabase = getSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("decks")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const rows = existing as Array<{ position: number }> | null;
  const nextPosition = (rows?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("decks")
    .insert({ name: trimmed, position: nextPosition })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function updateDeckNameAction(deckId: string, name: string): Promise<Deck> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("덱 이름을 입력하세요.");

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("decks")
    .update({ name: trimmed })
    .eq("id", deckId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function updateDeckTipsAction(deckId: string, tips: string): Promise<Deck> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.from("decks").update({ tips }).eq("id", deckId).select().single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function updateDeckViewGuideAction(deckId: string, viewGuide: string): Promise<Deck> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("decks")
    .update({ view_guide: viewGuide })
    .eq("id", deckId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function deleteDeckAction(deckId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Storage에 있는 실제 파일(대표 이미지 + 서브 이미지)을 먼저 정리한다.
  // DB 행은 on delete cascade로 정리되지만 Storage 파일은 별도로 지워야 한다.
  const [deckRes, subImagesRes] = await Promise.all([
    supabase.from("decks").select("main_image_storage_path").eq("id", deckId).maybeSingle(),
    supabase.from("deck_sub_images").select("storage_path").eq("deck_id", deckId),
  ]);
  if (deckRes.error) throw new Error(deckRes.error.message);
  if (subImagesRes.error) throw new Error(subImagesRes.error.message);

  const paths = [
    (deckRes.data as { main_image_storage_path: string | null } | null)?.main_image_storage_path,
    ...((subImagesRes.data as Array<{ storage_path: string }>) ?? []).map((r) => r.storage_path),
  ].filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}
