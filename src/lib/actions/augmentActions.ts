"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { STAGES } from "@/lib/constants";

const BUCKET = "augment-images";

/** 어느 스테이지에도 등록되지 않은 증강체를 완전히 삭제한다 (메모/이미지도 함께 정리). */
export async function deleteAugmentAction(augmentId: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  // Storage에 있는 실제 파일(아이콘 + 첨부 이미지)을 먼저 정리한다.
  // DB 행은 on delete cascade로 정리되지만 Storage 파일은 별도로 지워야 한다.
  const [imagesRes, augmentRes] = await Promise.all([
    supabase.from("augment_images").select("storage_path").eq("augment_id", augmentId),
    supabase.from("augments").select("icon_storage_path").eq("id", augmentId).maybeSingle(),
  ]);
  if (imagesRes.error) throw new Error(imagesRes.error.message);
  if (augmentRes.error) throw new Error(augmentRes.error.message);

  const paths = [
    ...((imagesRes.data as Array<{ storage_path: string }>) ?? []).map((r) => r.storage_path),
    (augmentRes.data as { icon_storage_path: string | null } | null)?.icon_storage_path,
  ].filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) throw new Error(removeError.message);
  }

  const { error } = await supabase.from("augments").delete().eq("id", augmentId);
  if (error) throw new Error(error.message);

  for (const stage of STAGES) revalidatePath(`/${stage}`);
}
