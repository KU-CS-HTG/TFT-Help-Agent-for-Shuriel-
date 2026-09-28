"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { Deck, DeckSubImage } from "@/lib/types";

const BUCKET = "augment-images";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function assertValidImage(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} 파일이 너무 큽니다 (최대 5MB).`);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${file.name} 은(는) 지원하지 않는 이미지 형식입니다 (png/jpg/webp만 가능).`);
  }
}

function extensionFor(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** 대표 이미지 업로드/교체. 이미 있으면 기존 파일을 지우고 새로 올린다. */
export async function uploadMainImageAction(formData: FormData): Promise<Deck> {
  const deckId = String(formData.get("deckId") ?? "");
  const file = formData.get("file");

  if (!deckId) throw new Error("잘못된 요청입니다.");
  if (!(file instanceof File) || file.size === 0) throw new Error("파일이 없습니다.");
  assertValidImage(file);

  const supabase = getSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("decks")
    .select("main_image_storage_path")
    .eq("id", deckId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const existingPath = (existing as { main_image_storage_path: string | null } | null)?.main_image_storage_path;
  if (existingPath) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([existingPath]);
    if (removeError) throw new Error(removeError.message);
  }

  const path = `decks/${deckId}/main-${crypto.randomUUID()}.${extensionFor(file)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
  });
  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("decks")
    .update({ main_image_url: publicUrlData.publicUrl, main_image_storage_path: path })
    .eq("id", deckId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function deleteMainImageAction(deckId: string, storagePath: string): Promise<Deck> {
  const supabase = getSupabaseServerClient();

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (removeError) throw new Error(removeError.message);

  const { data, error } = await supabase
    .from("decks")
    .update({ main_image_url: null, main_image_storage_path: null })
    .eq("id", deckId)
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
  return data as Deck;
}

export async function addSubImagesAction(formData: FormData): Promise<DeckSubImage[]> {
  const deckId = String(formData.get("deckId") ?? "");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!deckId) throw new Error("잘못된 요청입니다.");
  if (files.length === 0) return [];

  for (const file of files) assertValidImage(file);

  const supabase = getSupabaseServerClient();
  const inserted: DeckSubImage[] = [];

  for (const file of files) {
    const path = `decks/${deckId}/sub-${crypto.randomUUID()}.${extensionFor(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
    });
    if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: row, error: insertError } = await supabase
      .from("deck_sub_images")
      .insert({ deck_id: deckId, storage_path: path, url: publicUrlData.publicUrl, position: 0 })
      .select()
      .single();
    if (insertError) throw new Error(insertError.message);
    inserted.push(row as DeckSubImage);
  }

  revalidatePath("/decks");
  return inserted;
}

export async function deleteSubImageAction(imageId: string, storagePath: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error: removeError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (removeError) throw new Error(removeError.message);

  const { error } = await supabase.from("deck_sub_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  revalidatePath("/decks");
}
