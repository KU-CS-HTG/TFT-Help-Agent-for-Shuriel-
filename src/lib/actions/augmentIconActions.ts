"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { STAGES } from "@/lib/constants";
import type { Augment } from "@/lib/types";

const BUCKET = "augment-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

/** 잘못 나온 증강체 아이콘을 직접 교체한다. 이미 직접 교체한 적 있으면 그 파일을 지우고 새로 올린다. */
export async function updateAugmentIconAction(formData: FormData): Promise<Augment> {
  const augmentId = String(formData.get("augmentId") ?? "");
  const file = formData.get("file");

  if (!augmentId) throw new Error("잘못된 요청입니다.");
  if (!(file instanceof File) || file.size === 0) throw new Error("파일이 없습니다.");
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} 파일이 너무 큽니다 (최대 8MB).`);
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} 은(는) 이미지 파일이 아닙니다.`);

  const supabase = getSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("augments")
    .select("icon_storage_path")
    .eq("id", augmentId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const existingPath = (existing as { icon_storage_path: string | null } | null)?.icon_storage_path;
  if (existingPath) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([existingPath]);
    if (removeError) throw new Error(removeError.message);
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${augmentId}/icon-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
  });
  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("augments")
    .update({ icon_url: publicUrlData.publicUrl, icon_storage_path: path, icon_url_overridden: true })
    .eq("id", augmentId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  for (const stage of STAGES) revalidatePath(`/${stage}`);
  return data as Augment;
}
