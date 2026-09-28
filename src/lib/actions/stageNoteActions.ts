"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Stage } from "@/lib/constants";
import type { StageNote } from "@/lib/types";

export async function updateStageNoteAction(stage: Stage, content: string): Promise<StageNote> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("stage_notes")
    .upsert({ stage, content }, { onConflict: "stage" })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/${stage}`);
  return data as StageNote;
}
