"use client";

import { useState } from "react";
import { ITEM_CATEGORY_LABEL, RECOMMEND_TIERS, RECOMMEND_TIER_LABEL } from "@/lib/constants";
import type { DeckRecommendedItemDisplay, ItemWithExtras, RecommendableItem } from "@/lib/types";
import DraggablePoolCard from "./DraggablePoolCard";
import RecommendationDropZone from "./RecommendationDropZone";
import ItemModal from "./ItemModal";

interface Props {
  deckId: string;
  recommended: DeckRecommendedItemDisplay[];
  pool: RecommendableItem[];
  onRemove: (deckId: string, itemId: string) => void;
  allItems: ItemWithExtras[];
}

export default function DeckItemRecommendationSection({ deckId, recommended, pool, onRemove, allItems }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ItemWithExtras | null>(null);

  const filteredPool = pool.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  function handleOpenDetails(itemId: string) {
    const full = allItems.find((i) => i.id === itemId);
    if (!full) {
      setError("이 아이템 정보를 더 이상 찾을 수 없습니다 (삭제되었을 수 있어요).");
      return;
    }
    setError(null);
    setSelected(full);
  }

  function handleModalDelete(itemId: string) {
    setSelected(null);
    onRemove(deckId, itemId);
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600 hover:text-neutral-400"
      >
        추천 아이템
        <span className="normal-case text-neutral-700">{open ? "(접기)" : "(클릭해서 추가)"}</span>
      </button>

      <div className="flex flex-col gap-2">
        {RECOMMEND_TIERS.map((tier) => {
          const inTier = recommended.filter((r) => r.recommend_tier === tier);
          return (
            <div key={tier}>
              <p className="mb-1 text-[10px] text-neutral-500">{RECOMMEND_TIER_LABEL[tier]}</p>
              <RecommendationDropZone id={`deck-items:${deckId}:${tier}`}>
                {inTier.length === 0 ? (
                  <p className="text-xs text-neutral-500">이 칸으로 아이템을 드래그하세요.</p>
                ) : (
                  inTier.map((i) => (
                    <div
                      key={i.item_id}
                      className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2"
                      title={ITEM_CATEGORY_LABEL[i.category]}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(i.item_id)}
                        title="자세히 보기"
                        className="flex min-w-0 items-center gap-1"
                      >
                        {i.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.icon_url} alt={i.name} className="h-6 w-6 shrink-0 rounded" />
                        ) : (
                          <div className="h-6 w-6 shrink-0 rounded bg-neutral-700" />
                        )}
                        <span className="max-w-[6rem] truncate text-xs text-neutral-200">{i.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(deckId, i.item_id)}
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
          );
        })}
      </div>

      {open && (
        <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-950 p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이템 이름 검색..."
            className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-indigo-500"
          />
          {filteredPool.length === 0 ? (
            <p className="text-xs text-neutral-500">해당하는 아이템이 없습니다.</p>
          ) : (
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {filteredPool.map((i) => (
                <DraggablePoolCard
                  key={i.id}
                  id={`pool-item:${i.id}`}
                  name={`${i.name} (${ITEM_CATEGORY_LABEL[i.category]})`}
                  icon_url={i.icon_url}
                />
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

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {selected && (
        <ItemModal
          item={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => setSelected(updated)}
          onDelete={handleModalDelete}
        />
      )}
    </div>
  );
}
