"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ItemWithExtras } from "@/lib/types";
import ItemCard from "./ItemCard";

interface Props {
  items: ItemWithExtras[];
  matchesSearch: (item: ItemWithExtras) => boolean;
  onSelect: (item: ItemWithExtras) => void;
}

export default function ItemUnplacedPool({ items, matchesSearch, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "item-unplaced" });

  return (
    <div className="rounded-xl border border-neutral-800">
      <div className="border-b border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-400">
        미분류 ({items.length})
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[8rem] flex-wrap gap-2 p-3 transition ${
          isOver ? "bg-neutral-800/70" : "bg-neutral-900/50"
        }`}
      >
        {items.map((item) => (
          <ItemCard key={item.id} item={item} dimmed={!matchesSearch(item)} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
