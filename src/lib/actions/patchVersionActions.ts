"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { PatchVersion } from "@/lib/types";

export async function createPatchVersionAction(name: string): Promise<PatchVersion> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("패치 버전 이름을 입력하세요.");

  const supabase = getSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("patch_versions")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const rows = existing as Array<{ position: number }> | null;
  const nextPosition = (rows?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("patch_versions")
    .insert({ name: trimmed, position: nextPosition })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as PatchVersion;
}

export async function renamePatchVersionAction(patchVersionId: string, name: string): Promise<PatchVersion> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("패치 버전 이름을 입력하세요.");

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("patch_versions")
    .update({ name: trimmed })
    .eq("id", patchVersionId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as PatchVersion;
}

export async function deletePatchVersionAction(patchVersionId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("patch_versions").delete().eq("id", patchVersionId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}

export async function addDeckToPatchAction(patchVersionId: string, deckId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("patch_deck_selections")
    .select("position")
    .eq("patch_version_id", patchVersionId)
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const rows = existing as Array<{ position: number }> | null;
  const nextPosition = (rows?.[0]?.position ?? -1) + 1;

  const { error } = await supabase
    .from("patch_deck_selections")
    .upsert(
      { patch_version_id: patchVersionId, deck_id: deckId, position: nextPosition },
      { onConflict: "patch_version_id,deck_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}

export async function removeDeckFromPatchAction(patchVersionId: string, deckId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("patch_deck_selections")
    .delete()
    .eq("patch_version_id", patchVersionId)
    .eq("deck_id", deckId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}
