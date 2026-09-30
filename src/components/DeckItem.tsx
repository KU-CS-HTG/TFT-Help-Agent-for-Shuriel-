"use client";

import { useRef, useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ITEM_CATEGORY_LABEL } from "@/lib/constants";
import type { DeckWithImages } from "@/lib/types";
import { deleteDeckAction, updateDeckNameAction, updateDeckTipsAction } from "@/lib/actions/deckActions";
import {
  addSubImagesAction,
  deleteMainImageAction,
  deleteSubImageAction,
  uploadMainImageAction,
} from "@/lib/actions/deckImageActions";
import { UNSAVED_CHANGES_MESSAGE, useRegisterDirty } from "@/lib/unsavedChanges";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

function RecommendationDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[3.5rem] flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 transition ${
        isOver ? "border-indigo-500 bg-neutral-800/70" : "border-neutral-700 bg-neutral-950"
      }`}
    >
      {children}
    </div>
  );
}

interface Props {
  deck: DeckWithImages;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (deck: DeckWithImages) => void;
  onDelete: (deckId: string) => void;
  onRemoveRecommendedAugment: (deckId: string, augmentId: string) => void;
  onRemoveRecommendedItem: (deckId: string, itemId: string) => void;
}

export default function DeckItem({
  deck,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onRemoveRecommendedAugment,
  onRemoveRecommendedItem,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(deck.name);
  const [tipsContent, setTipsContent] = useState(deck.tips);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const addSubImageInputRef = useRef<HTMLInputElement>(null);
  const replaceSubImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const tipsDirty = tipsContent !== deck.tips;
  useRegisterDirty(`deck-tips-${deck.id}`, tipsDirty);

  function startEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameInput(deck.name);
    setIsEditingName(true);
  }

  function cancelEditName(e: React.MouseEvent) {
    e.stopPropagation();
    setNameInput(deck.name);
    setIsEditingName(false);
  }

  function saveName(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateDeckNameAction(deck.id, nameInput);
        onUpdate({ ...deck, ...updated });
        setIsEditingName(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`"${deck.name}" 덱을 삭제할까요? 등록된 이미지와 팁도 함께 삭제됩니다.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteDeckAction(deck.id);
        onDelete(deck.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  function saveTips() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateDeckTipsAction(deck.id, tipsContent);
        onUpdate({ ...deck, ...updated });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function cancelTips() {
    setTipsContent(deck.tips);
  }

  function handleMainImageChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("deckId", deck.id);
    formData.set("file", files[0]);

    startTransition(async () => {
      try {
        const updated = await uploadMainImageAction(formData);
        onUpdate({ ...deck, ...updated });
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드 실패");
      }
    });
  }

  function handleDeleteMainImage() {
    if (!deck.main_image_storage_path) return;
    setError(null);
    startTransition(async () => {
      try {
        const updated = await deleteMainImageAction(deck.id, deck.main_image_storage_path!);
        onUpdate({ ...deck, ...updated });
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  function handleAddSubImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("deckId", deck.id);
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      try {
        const inserted = await addSubImagesAction(formData);
        onUpdate({ ...deck, subImages: [...deck.subImages, ...inserted] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드 실패");
      }
    });
  }

  function handleDeleteSubImage(imageId: string, storagePath: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteSubImageAction(imageId, storagePath);
        onUpdate({ ...deck, subImages: deck.subImages.filter((i) => i.id !== imageId) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  function handleReplaceSubImage(imageId: string, storagePath: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("deckId", deck.id);
    formData.append("files", files[0]);

    startTransition(async () => {
      try {
        await deleteSubImageAction(imageId, storagePath);
        const inserted = await addSubImagesAction(formData);
        onUpdate({
          ...deck,
          subImages: [...deck.subImages.filter((i) => i.id !== imageId), ...inserted],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "교체 실패");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900">
      <div
        className="flex cursor-pointer items-center justify-between gap-2 p-3"
        onClick={() => {
          if (tipsDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
          onToggle();
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-neutral-500">{expanded ? "▾" : "▸"}</span>
          {isEditingName ? (
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full min-w-0 rounded border border-indigo-500 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 outline-none"
            />
          ) : (
            <p className="truncate text-sm font-medium text-neutral-100">{deck.name}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isEditingName ? (
            <>
              <button
                type="button"
                disabled={pending || !nameInput.trim()}
                onClick={saveName}
                className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={cancelEditName}
                className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={startEditName}
                className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
              >
                이름 수정
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="rounded bg-neutral-800 px-2 py-1 text-xs text-red-300 hover:bg-neutral-700 disabled:opacity-50"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      <div className={expanded ? "border-t border-neutral-800 p-3" : "hidden"}>
        <div className="mb-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">대표 이미지</p>
          {deck.main_image_url ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deck.main_image_url}
                alt={deck.name}
                className="w-full rounded-lg border border-neutral-700 object-contain"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => mainImageInputRef.current?.click()}
                  className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
                >
                  교체
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleDeleteMainImage}
                  className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-red-300 hover:bg-neutral-700 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => mainImageInputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-neutral-700 bg-neutral-950 py-6 text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-50"
            >
              + 대표 이미지 추가
            </button>
          )}
          <input
            ref={mainImageInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleMainImageChange(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-600">서브 이미지</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => addSubImageInputRef.current?.click()}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
            >
              + 이미지 추가
            </button>
            <input
              ref={addSubImageInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                handleAddSubImages(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {deck.subImages.length === 0 ? (
            <p className="text-sm text-neutral-500">등록된 서브 이미지가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {deck.subImages.map((img) => (
                <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-700">
                  <a href={img.url} target="_blank" rel="noopener noreferrer" title="새 탭에서 크게 보기">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="서브 이미지" className="h-full w-full object-cover" />
                  </a>
                  <div className="absolute inset-x-0 bottom-0 flex bg-black/60 text-[10px]">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => replaceSubImageInputRefs.current[img.id]?.click()}
                      className="flex-1 py-1 text-neutral-200 hover:bg-white/10"
                    >
                      교체
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeleteSubImage(img.id, img.storage_path)}
                      className="flex-1 py-1 text-red-300 hover:bg-white/10"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    ref={(el) => {
                      replaceSubImageInputRefs.current[img.id] = el;
                    }}
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      handleReplaceSubImage(img.id, img.storage_path, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">추천 증강체</p>
          <RecommendationDropZone id={`deck-augments:${deck.id}`}>
            {deck.recommendedAugments.length === 0 ? (
              <p className="text-xs text-neutral-500">위의 추천 후보 목록에서 증강체를 이 칸으로 드래그하세요.</p>
            ) : (
              deck.recommendedAugments.map((a) => (
                <div key={a.augment_id} className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2">
                  {a.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.icon_url} alt={a.name} className="h-6 w-6 rounded" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-neutral-700" />
                  )}
                  <span className="max-w-[6rem] truncate text-xs text-neutral-200">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveRecommendedAugment(deck.id, a.augment_id)}
                    className="text-xs text-red-300 hover:text-red-200"
                    title="제거"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </RecommendationDropZone>
        </div>

        <div className="mb-4">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">추천 아이템</p>
          <RecommendationDropZone id={`deck-items:${deck.id}`}>
            {deck.recommendedItems.length === 0 ? (
              <p className="text-xs text-neutral-500">위의 추천 후보 목록에서 아이템을 이 칸으로 드래그하세요.</p>
            ) : (
              deck.recommendedItems.map((i) => (
                <div
                  key={i.item_id}
                  className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2"
                  title={ITEM_CATEGORY_LABEL[i.category]}
                >
                  {i.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.icon_url} alt={i.name} className="h-6 w-6 rounded" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-neutral-700" />
                  )}
                  <span className="max-w-[6rem] truncate text-xs text-neutral-200">{i.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveRecommendedItem(deck.id, i.item_id)}
                    className="text-xs text-red-300 hover:text-red-200"
                    title="제거"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </RecommendationDropZone>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">플레이 팁</p>
          <textarea
            value={tipsContent}
            onChange={(e) => setTipsContent(e.target.value)}
            placeholder="이 덱을 플레이할 때 알아두면 좋은 팁을 자유롭게 적어두세요."
            rows={6}
            className="min-h-[6rem] w-full resize-y whitespace-pre-wrap rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending || !tipsDirty}
              onClick={saveTips}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              disabled={pending || !tipsDirty}
              onClick={cancelTips}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
