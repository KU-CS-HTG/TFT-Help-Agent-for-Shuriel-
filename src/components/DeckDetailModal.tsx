"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ITEM_CATEGORY_LABEL, RECOMMEND_TIERS, RECOMMEND_TIER_LABEL } from "@/lib/constants";
import type { DeckWithImages } from "@/lib/types";

interface Props {
  deck: DeckWithImages;
  onClose: () => void;
}

/** 패치 버전 카드에 넣어둔 덱 칩을 클릭했을 때 보여주는 읽기 전용 상세 정보.
 * 실제 수정은 "전체 덱 목록"에서 해당 덱을 펼쳐서 한다. */
export default function DeckDetailModal({ deck, onClose }: Props) {
  const hasRecommendations = deck.recommendedAugments.length > 0 || deck.recommendedItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-100">{deck.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
          >
            닫기
          </button>
        </div>

        {deck.main_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deck.main_image_url}
            alt={deck.name}
            className="mb-3 w-full rounded-lg border border-neutral-700 object-contain"
          />
        )}

        <div className="mb-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">각 보는 방법</p>
          <div className="prose prose-invert prose-sm max-w-none text-sm text-neutral-200">
            {deck.view_guide.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{deck.view_guide}</ReactMarkdown>
            ) : (
              <p className="text-neutral-500">작성된 내용이 없습니다.</p>
            )}
          </div>
        </div>

        {deck.subImages.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">서브 이미지</p>
            <div className="flex flex-wrap gap-2">
              {deck.subImages.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="새 탭에서 크게 보기"
                  className="block h-16 w-16 overflow-hidden rounded-lg border border-neutral-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="서브 이미지" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {hasRecommendations && (
          <div className="mb-3 flex flex-col gap-3">
            {deck.recommendedAugments.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">추천 증강체</p>
                {RECOMMEND_TIERS.map((tier) => {
                  const inTier = deck.recommendedAugments.filter((r) => r.recommend_tier === tier);
                  if (inTier.length === 0) return null;
                  return (
                    <div key={tier} className="mb-1">
                      <p className="mb-1 text-[10px] text-neutral-500">{RECOMMEND_TIER_LABEL[tier]}</p>
                      <div className="flex flex-wrap gap-2">
                        {inTier.map((a) => (
                          <div
                            key={a.augment_id}
                            className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2"
                          >
                            {a.icon_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.icon_url} alt={a.name} className="h-6 w-6 shrink-0 rounded" />
                            ) : (
                              <div className="h-6 w-6 shrink-0 rounded bg-neutral-700" />
                            )}
                            <span className="max-w-[6rem] truncate text-xs text-neutral-200">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {deck.recommendedItems.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">추천 아이템</p>
                {RECOMMEND_TIERS.map((tier) => {
                  const inTier = deck.recommendedItems.filter((r) => r.recommend_tier === tier);
                  if (inTier.length === 0) return null;
                  return (
                    <div key={tier} className="mb-1">
                      <p className="mb-1 text-[10px] text-neutral-500">{RECOMMEND_TIER_LABEL[tier]}</p>
                      <div className="flex flex-wrap gap-2">
                        {inTier.map((i) => (
                          <div
                            key={i.item_id}
                            className="flex items-center gap-1 rounded-lg bg-neutral-800 py-1 pl-1 pr-2"
                            title={ITEM_CATEGORY_LABEL[i.category]}
                          >
                            {i.icon_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={i.icon_url} alt={i.name} className="h-6 w-6 shrink-0 rounded" />
                            ) : (
                              <div className="h-6 w-6 shrink-0 rounded bg-neutral-700" />
                            )}
                            <span className="max-w-[6rem] truncate text-xs text-neutral-200">{i.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">플레이 팁</p>
          <div className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-sm text-neutral-200">
            {deck.tips.trim() ? deck.tips : <span className="text-neutral-500">작성된 내용이 없습니다.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
