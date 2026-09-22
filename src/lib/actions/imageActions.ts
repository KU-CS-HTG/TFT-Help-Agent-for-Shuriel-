"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Stage } from "@/lib/constants";
import type { AugmentImage } from "@/lib/types";

const BUCKET = "augment-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

export async function addImagesAction(formData: FormData): Promise<AugmentImage[]> {
  const augmentId = String(formData.get("augmentId") ?? "");
  const stage = String(formData.get("stage") ?? "") as Stage;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!augmentId || !stage) throw new Error("잘못된 요청입니다.");
  if (files.length === 0) return [];

  const supabase = getSupabaseServerClient();
  const inserted: AugmentImage[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name} 파일이 너무 큽니다 (최대 8MB).`);
    }
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} 은(는) 이미지 파일이 아닙니다.`);
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const path = `${augmentId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type });
    if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("augment_images")
      .insert({ augment_id: augmentId, storage_path: path, url: publicUrlData.publicUrl, position: 0 })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);
    inserted.push(row as AugmentImage);
  }

  revalidatePath(`/${stage}`);
  return inserted;
}

export async function deleteImageAction(imageId: string, storagePath: string, stage: Stage) {
  const supabase = getSupabaseServerClient();

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (removeError) throw new Error(removeError.message);

  const { error: deleteError } = await supabase.from("augment_images").delete().eq("id", imageId);
  if (deleteError) throw new Error(deleteError.message);

  revalidatePath(`/${stage}`);
}
