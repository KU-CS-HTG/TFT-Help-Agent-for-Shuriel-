"use client";

import { useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AugmentWithExtras } from "@/lib/types";
import { STAGES, type Stage } from "@/lib/constants";
import { updateNoteAction } from "@/lib/actions/noteActions";
import { updateGameDescriptionAction } from "@/lib/actions/descriptionActions";
import { addImagesAction, deleteImageAction } from "@/lib/actions/imageActions";
import { updateExtraStagesAction } from "@/lib/actions/stageMembershipActions";

interface Props {
  augment: AugmentWithExtras;
  stage: Stage;
  onClose: () => void;
  onUpdate: (augment: AugmentWithExtras) => void;
}

export default function AugmentModal({ augment, stage, onClose, onUpdate }: Props) {
  const [noteContent, setNoteContent] = useState(augment.note?.content ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [descriptionContent, setDescriptionContent] = useState(augment.description_game);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function saveNote(content: string) {
    setError(null);
    startTransition(async () => {
      try {
        const note = await updateNoteAction(augment.id, stage, content);
        onUpdate({ ...augment, note });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function handleClear() {
    setNoteContent("");
    saveNote("");
  }

  function saveDescription() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateGameDescriptionAction(augment.id, stage, descriptionContent);
        onUpdate({ ...augment, ...updated });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function toggleExtraStage(target: Stage, checked: boolean) {
    setError(null);
    const nextExtraStages = checked
      ? [...augment.extra_stages, target]
      : augment.extra_stages.filter((s) => s !== target);
    startTransition(async () => {
      try {
        const updated = await updateExtraStagesAction(augment.id, augment.stage, nextExtraStages);
        onUpdate({ ...augment, ...updated });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("augmentId", augment.id);
    formData.set("stage", stage);
    for (const file of Array.from(files)) formData.append("files", file);

    startTransition(async () => {
      try {
        const inserted = await addImagesAction(formData);
        onUpdate({ ...augment, images: [...augment.images, ...inserted] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드 실패");
      }
    });
  }

  function handleDeleteImage(imageId: string, storagePath: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteImageAction(imageId, storagePath, stage);
        onUpdate({ ...augment, images: augment.images.filter((i) => i.id !== imageId) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  function handleReplaceImage(imageId: string, storagePath: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const formData = new FormData();
    formData.set("augmentId", augment.id);
    formData.set("stage", stage);
    formData.append("files", files[0]);

    startTransition(async () => {
      try {
        await deleteImageAction(imageId, storagePath, stage);
        const inserted = await addImagesAction(formData);
        onUpdate({
          ...augment,
          images: [...augment.images.filter((i) => i.id !== imageId), ...inserted],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "교체 실패");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {augment.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={augment.icon_url} alt={augment.name} className="h-14 w-14 rounded" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded bg-neutral-800 text-[10px] text-neutral-500">
                이미지 없음
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">{augment.name}</h2>
              <p className="text-xs text-neutral-500">
                {augment.rarity.toUpperCase()} · {augment.patch_version} 기준
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
          >
            닫기
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-neutral-950 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-600">등장 스테이지</p>
          <div className="flex flex-wrap gap-3">
            {STAGES.map((s) => {
              const isPrimary = s === augment.stage;
              const checked = isPrimary || augment.extra_stages.includes(s);
              return (
                <label
                  key={s}
                  className={`flex items-center gap-1.5 text-xs ${
                    isPrimary ? "text-neutral-500" : "text-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPrimary || pending}
                    onChange={(e) => toggleExtraStage(s, e.target.checked)}
                    className="h-3.5 w-3.5 accent-indigo-500 disabled:opacity-60"
                  />
                  {s}
                  {isPrimary && <span className="text-[10px] text-neutral-600">(기본)</span>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-neutral-950 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-600">
              게임 내 설명
              {augment.description_game_overridden && (
                <span className="ml-2 normal-case text-indigo-400">(직접 수정됨)</span>
              )}
            </p>
          </div>
          <p className="mb-2 text-[10px] text-neutral-600">
            @Gold@ 같은 @ 표시는 게임 데이터의 원본 변수라 자동으로 숫자가 채워지지 않습니다. 필요하면
            아래에서 직접 실제 값으로 고쳐서 저장하세요.
          </p>
          <textarea
            value={descriptionContent}
            onChange={(e) => setDescriptionContent(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-neutral-300 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            disabled={pending || descriptionContent === augment.description_game}
            onClick={saveDescription}
            className="mt-2 rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            저장
          </button>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-200">
              내 메모
              {augment.note?.updated_at && (
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  마지막 수정: {augment.note.patch_version ?? "?"} ·{" "}
                  {new Date(augment.note.updated_at).toLocaleString("ko-KR")}
                </span>
              )}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
                className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
              >
                {mode === "edit" ? "미리보기" : "편집"}
              </button>
            </div>
          </div>

          {mode === "edit" ? (
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="비어 있음 (마크다운 작성 가능)"
              rows={6}
              className="w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-indigo-500"
            />
          ) : (
            <div className="min-h-[8rem] rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-200 prose prose-invert prose-sm max-w-none">
              {noteContent.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{noteContent}</ReactMarkdown>
              ) : (
                <p className="text-neutral-500">비어 있음</p>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => saveNote(noteContent)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleClear}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
            >
              내용 지우기
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-200">이미지</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => addFileInputRef.current?.click()}
              className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
            >
              + 이미지 추가
            </button>
            <input
              ref={addFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleAddFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {augment.images.length === 0 ? (
            <p className="text-sm text-neutral-500">등록된 이미지가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {augment.images.map((img) => (
                <div key={img.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-neutral-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="첨부 이미지" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex bg-black/60 text-[10px]">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => replaceInputRefs.current[img.id]?.click()}
                      className="flex-1 py-1 text-neutral-200 hover:bg-white/10"
                    >
                      교체
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDeleteImage(img.id, img.storage_path)}
                      className="flex-1 py-1 text-red-300 hover:bg-white/10"
                    >
                      삭제
                    </button>
                  </div>
                  <input
                    ref={(el) => {
                      replaceInputRefs.current[img.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleReplaceImage(img.id, img.storage_path, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
