"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ITEM_CATEGORY_LABEL } from "@/lib/constants";
import type { RecommendableAugment, RecommendableItem } from "@/lib/types";

interface Props {
  augments: RecommendableAugment[];
  items: RecommendableItem[];
}

function DraggablePoolCard({ id, name, icon_url }: { id: string; name: string; icon_url: string | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 p-1 transition hover:border-indigo-500 ${
        isDragging ? "z-50 cursor-grabbing opacity-90 shadow-xl" : "cursor-grab"
      }`}
      title={name}
    >
      {icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon_url} alt={name} className="h-9 w-9 rounded object-cover" draggable={false} />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded bg-neutral-700 text-center text-[8px] text-neutral-400">
          없음
        </div>
      )}
      <span className="line-clamp-2 text-center text-[9px] leading-tight text-neutral-200">{name}</span>
    </button>
  );
}

export default function RecommendationPools({ augments, items }: Props) {
  const [open, setOpen] = useState(false);
  const [augmentSearch, setAugmentSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const filteredAugments = augments.filter((a) =>
    a.name.toLowerCase().includes(augmentSearch.trim().toLowerCase())
  );
  const filteredItems = items.filter((i) => i.name.toLowerCase().includes(itemSearch.trim().toLowerCase()));

  return (
    <div className="rounded-xl border border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-900"
      >
        <span>추천 증강체/아이템 후보 (덱으로 드래그)</span>
        <span className="text-xs text-neutral-500">{open ? "접기" : "펼치기"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-neutral-800 p-3">
          <p className="text-[10px] text-neutral-600">
            아래 카드를 덱 목록을 펼쳤을 때 나오는 &quot;추천 증강체&quot; / &quot;추천 아이템&quot; 칸으로
            드래그하면 그 덱에 추천으로 등록됩니다. 어느 스테이지에도 없는 증강체나 티어에 배치하지 않은
            아이템은 여기 나타나지 않습니다.
          </p>

          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">증강체</p>
            <input
              type="text"
              value={augmentSearch}
              onChange={(e) => setAugmentSearch(e.target.value)}
              placeholder="증강체 이름 검색..."
              className="mb-2 w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-indigo-500"
            />
            {filteredAugments.length === 0 ? (
              <p className="text-xs text-neutral-500">해당하는 증강체가 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredAugments.map((a) => (
                  <DraggablePoolCard key={a.id} id={`pool-augment:${a.id}`} name={a.name} icon_url={a.icon_url} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-600">아이템</p>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="아이템 이름 검색..."
              className="mb-2 w-full max-w-sm rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-100 outline-none focus:border-indigo-500"
            />
            {filteredItems.length === 0 ? (
              <p className="text-xs text-neutral-500">해당하는 아이템이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredItems.map((i) => (
                  <DraggablePoolCard
                    key={i.id}
                    id={`pool-item:${i.id}`}
                    name={`${i.name} (${ITEM_CATEGORY_LABEL[i.category]})`}
                    icon_url={i.icon_url}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
