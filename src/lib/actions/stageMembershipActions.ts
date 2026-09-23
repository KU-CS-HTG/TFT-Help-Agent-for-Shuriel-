"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { STAGES, type Stage } from "@/lib/constants";
import type { Augment } from "@/lib/types";

export async function updateStagesAction(augmentId: string, stages: Stage[]): Promise<Augment> {
  const supabase = getSupabaseServerClient();

  const cleaned = [...new Set(stages)];

  const { data, error } = await supabase
    .from("augments")
    .update({ stages: cleaned })
    .eq("id", augmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // 이 증강체가 등장하는 스테이지 조합이 바뀌었을 수 있으니 전부 갱신한다.
  for (const stage of STAGES) revalidatePath(`/${stage}`);

  return data as Augment;
}
