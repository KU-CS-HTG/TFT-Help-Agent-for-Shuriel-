"use client";

import { useState, useTransition } from "react";
import type { Stage } from "@/lib/constants";
import type { StageNote } from "@/lib/types";
import { updateStageNoteAction } from "@/lib/actions/stageNoteActions";
import { useRegisterDirty } from "@/lib/unsavedChanges";

interface Props {
  stage: Stage;
  initialNote: StageNote | null;
}

export default function StageNoteEditor({ stage, initialNote }: Props) {
  const [content, setContent] = useState(initialNote?.content ?? "");
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useRegisterDirty(`stage-note-${stage}`, content !== (note?.content ?? ""));

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await updateStageNoteAction(stage, content);
        setNote(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패");
      }
    });
  }

  return (
    <div className="mx-4 mt-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-200">{stage} 증강체 선택 방향 메모</p>
        {note?.updated_at && (
          <span className="text-xs text-neutral-500">
            마지막 수정: {new Date(note.updated_at).toLocaleString("ko-KR")}
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="이 스테이지에서 증강체를 고르는 방향성을 자유롭게 적어두세요."
        rows={8}
        className="min-h-[8rem] w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
      />
      <p className="mt-1 text-[10px] text-neutral-600">우측 하단 모서리를 드래그하면 칸 크기를 조절할 수 있습니다.</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending || content === (note?.content ?? "")}
          onClick={save}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          저장
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
