"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchAndParseAugments, upsertAugments, type UpsertSummary } from "@/lib/ingest";
import { STAGES } from "@/lib/constants";

export async function refreshDataAction(): Promise<UpsertSummary> {
  const result = await fetchAndParseAugments();
  const supabase = getSupabaseServerClient();
  const summary = await upsertAugments(supabase, result);

  for (const stage of STAGES) {
    revalidatePath(`/${stage}`);
  }

  return summary;
}
