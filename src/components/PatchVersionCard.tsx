"use client";

import { useState } from "react";
import type { DeckWithImages } from "@/lib/types";
import DraggablePoolCard from "./DraggablePoolCard";
import RecommendationDropZone from "./RecommendationDropZone";

interface Props {
  patchVersionId: string;
  name: string;
  assignedDecks: DeckWithImages[];
  pool: DeckWithImages[];
  onRename: (patchVersionId: string, name: string) => void;
  onDelete: (patchVersionId: string) => void;
  onRemoveDeck: (patchVersionId: string, deckId: string) => void;
  onOpenDetail: (deckId: string) => void;
}

export default function PatchVersionCard({
  patchVersionId,
  name,
  assignedDecks,
  pool,
  onRename,
  onDelete,
  onRemoveDeck,
  onOpenDetail,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPool = pool.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()));

  function startEditName() {
    setNameInput(name);
    setIsEditingName(true);
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    onRename(patchVersionId, trimmed);
    setIsEditingName(false);
  }

  function handleDelete() {
    if (
      !window.confirm(
        `"${name}" 패치 버전을 삭제할까요? 이 패치 버전에 넣어둔 덱 목록(연결 정보)만 삭제되고, 덱 자체는 남아있습니다.`
      )
    )
      return;
    onDelete(patchVersionId);
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {isEditingName ? (
          <>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
              }}
              autoFocus
              className="min-w-0 flex-1 rounded border border-indigo-500 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 outline-none"
            />
            <button
              type="button"
              disabled={!nameInput.trim()}
              onClick={saveName}
              className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">{name}</p>
            <button
              type="button"
              onClick={startEditName}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
            >
              이름 수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded bg-neutral-800 px-2 py-1 text-xs text-red-300 hover:bg-neutral-700"
            >
              삭제
            </button>
          </>
        )}
      </div>

      <RecommendationDropZone id={`patch-decks:${patchVersionId}`}>
        {assignedDecks.length === 0 ? (
          <p className="text-xs text-neutral-500">이 칸으로 덱을 드래그하세요.</p>
        ) : (
          assignedDecks.map((d) => (
            <div key={d.id} className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2">
              <button
                type="button"
                onClick={() => onOpenDetail(d.id)}
                title="자세히 보기"
                className="flex min-w-0 items-center gap-1"
              >
                {d.main_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.main_image_url} alt={d.name} className="h-6 w-6 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-6 w-6 shrink-0 rounded bg-neutral-700" />
                )}
                <span className="max-w-[8rem] truncate text-xs text-neutral-200">{d.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveDeck(patchVersionId, d.id)}
                className="text-xs text-red-300 hover:text-red-200"
                title="제거"
              >
                ×
              </button>
            </div>
          ))
        )}
      </RecommendationDropZone>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600 hover:text-neutral-400"
      >
        덱 추가
        <span className="normal-case text-neutral-700">{open ? "(접기)" : "(클릭해서 추가)"}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="덱 이름 검색..."
            className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-indigo-500"
          />
          {filteredPool.length === 0 ? (
            <p className="text-xs text-neutral-500">해당하는 덱이 없습니다.</p>
          ) : (
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {filteredPool.map((d) => (
                <DraggablePoolCard key={d.id} id={`pool-deck:${d.id}`} name={d.name} icon_url={d.main_image_url} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}
