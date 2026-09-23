"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { STAGES, type Stage } from "@/lib/constants";
import type { Augment } from "@/lib/types";

export async function updateExtraStagesAction(
  augmentId: string,
  primaryStage: Stage,
  extraStages: Stage[]
): Promise<Augment> {
  const supabase = getSupabaseServerClient();

  // 기본 스테이지는 extra_stages에 중복으로 넣지 않는다.
  const cleaned = [...new Set(extraStages)].filter((s) => s !== primaryStage);

  const { data, error } = await supabase
    .from("augments")
    .update({ extra_stages: cleaned })
    .eq("id", augmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // 이 증강체가 등장하는 스테이지 조합이 바뀌었을 수 있으니 전부 갱신한다.
  for (const stage of STAGES) revalidatePath(`/${stage}`);

  return data as Augment;
}
