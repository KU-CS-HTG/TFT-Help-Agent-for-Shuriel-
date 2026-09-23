"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Stage } from "@/lib/constants";
import type { Augment } from "@/lib/types";

export async function updateGameDescriptionAction(
  augmentId: string,
  stage: Stage,
  content: string
): Promise<Augment> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("augments")
    .update({ description_game: content, description_game_overridden: true })
    .eq("id", augmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/${stage}`);
  return data as Augment;
}
