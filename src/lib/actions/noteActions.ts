"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { CURRENT_PATCH_VERSION, type Stage } from "@/lib/constants";
import type { AugmentNote } from "@/lib/types";

export async function updateNoteAction(augmentId: string, stage: Stage, content: string): Promise<AugmentNote> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("augment_notes")
    .upsert(
      { augment_id: augmentId, content, patch_version: CURRENT_PATCH_VERSION },
      { onConflict: "augment_id" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/${stage}`);
  return data as AugmentNote;
}
