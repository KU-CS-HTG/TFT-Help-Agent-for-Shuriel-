"use client";

import { useDroppable } from "@dnd-kit/core";
import { TIER_COLOR, type ItemTier } from "@/lib/constants";
import type { ItemWithExtras } from "@/lib/types";
import ItemCard from "./ItemCard";

interface Props {
  tier: ItemTier;
  items: ItemWithExtras[];
  matchesSearch: (item: ItemWithExtras) => boolean;
  onSelect: (item: ItemWithExtras) => void;
}

export default function ItemTierRow({ tier, items, matchesSearch, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `item-tier:${tier}` });

  return (
    <div className="flex border-b border-neutral-800 last:border-b-0">
      <div
        className="flex w-14 shrink-0 items-center justify-center text-2xl font-bold text-neutral-950"
        style={{ backgroundColor: TIER_COLOR[tier] }}
      >
        {tier}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[6rem] flex-1 flex-wrap items-start gap-2 p-2 transition ${
          isOver ? "bg-neutral-800/70" : "bg-neutral-900"
        }`}
      >
        {items.map((item) => (
          <ItemCard key={item.id} item={item} dimmed={!matchesSearch(item)} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
