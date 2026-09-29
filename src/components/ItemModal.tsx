"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ITEM_CATEGORY_LABEL } from "@/lib/constants";
import type { ItemWithExtras } from "@/lib/types";
import { updateItemNoteAction } from "@/lib/actions/itemNoteActions";
import { UNSAVED_CHANGES_MESSAGE, useRegisterDirty } from "@/lib/unsavedChanges";

interface Props {
  item: ItemWithExtras;
  onClose: () => void;
  onUpdate: (item: ItemWithExtras) => void;
}

export default function ItemModal({ item, onClose, onUpdate }: Props) {
  const [noteContent, setNoteContent] = useState(item.note?.content ?? "");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = noteContent !== (item.note?.content ?? "");
  useRegisterDirty(`item-modal-${item.id}`, dirty);

  function handleClose() {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    onClose();
  }

  function saveNote(content: string) {
    setError(null);
    startTransition(async () => {
      try {
        const note = await updateItemNoteAction(item.id, content);
        onUpdate({ ...item, note });
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  function handleClear() {
    setNoteContent("");
    saveNote("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {item.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.icon_url} alt={item.name} className="h-14 w-14 rounded" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded bg-neutral-800 text-[10px] text-neutral-500">
                이미지 없음
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">{item.name}</h2>
              <p className="text-xs text-neutral-500">
                {ITEM_CATEGORY_LABEL[item.category]} · {item.patch_version} 기준
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
          >
            닫기
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-neutral-950 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-600">아이템 능력치 설명</p>
          <p className="whitespace-pre-wrap text-sm text-neutral-300">
            {item.official_desc.trim() ? item.official_desc : "설명 없음"}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-200">
              내 메모
              {item.note?.updated_at && (
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  마지막 수정: {new Date(item.note.updated_at).toLocaleString("ko-KR")}
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

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
