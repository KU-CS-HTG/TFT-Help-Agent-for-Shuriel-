"use client";

import { useState } from "react";
import { RECOMMEND_TIERS, RECOMMEND_TIER_LABEL } from "@/lib/constants";
import type { DeckRecommendedAugmentDisplay, RecommendableAugment } from "@/lib/types";
import DraggablePoolCard from "./DraggablePoolCard";
import RecommendationDropZone from "./RecommendationDropZone";

interface Props {
  deckId: string;
  recommended: DeckRecommendedAugmentDisplay[];
  pool: RecommendableAugment[];
  onRemove: (deckId: string, augmentId: string) => void;
}

export default function DeckAugmentRecommendationSection({ deckId, recommended, pool, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredPool = pool.filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600 hover:text-neutral-400"
      >
        추천 증강체
        <span className="normal-case text-neutral-700">{open ? "(접기)" : "(클릭해서 추가)"}</span>
      </button>

      <div className="flex flex-col gap-2">
        {RECOMMEND_TIERS.map((tier) => {
          const inTier = recommended.filter((r) => r.recommend_tier === tier);
          return (
            <div key={tier}>
              <p className="mb-1 text-[10px] text-neutral-500">{RECOMMEND_TIER_LABEL[tier]}</p>
              <RecommendationDropZone id={`deck-augments:${deckId}:${tier}`}>
                {inTier.length === 0 ? (
                  <p className="text-xs text-neutral-500">이 칸으로 증강체를 드래그하세요.</p>
                ) : (
                  inTier.map((a) => (
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
                        onClick={() => onRemove(deckId, a.augment_id)}
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
            placeholder="증강체 이름 검색..."
            className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-indigo-500"
          />
          {filteredPool.length === 0 ? (
            <p className="text-xs text-neutral-500">해당하는 증강체가 없습니다.</p>
          ) : (
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {filteredPool.map((a) => (
                <DraggablePoolCard key={a.id} id={`pool-augment:${a.id}`} name={a.name} icon_url={a.icon_url} />
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
