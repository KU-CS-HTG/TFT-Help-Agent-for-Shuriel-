"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ItemWithExtras } from "@/lib/types";

interface Props {
  item: ItemWithExtras;
  dimmed: boolean;
  onSelect: (item: ItemWithExtras) => void;
}

export default function ItemCard({ item, dimmed, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(item)}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`relative flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 transition hover:border-indigo-500 ${
        isDragging ? "z-50 cursor-grabbing opacity-90 shadow-xl" : "cursor-grab"
      } ${dimmed ? "opacity-25 grayscale" : "opacity-100"}`}
      title={item.name}
    >
      {item.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.icon_url} alt={item.name} className="h-12 w-12 rounded object-cover" draggable={false} />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-neutral-700 text-center text-[9px] text-neutral-400">
          이미지 없음
        </div>
      )}
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-neutral-200">{item.name}</span>
      {item.note?.content && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-400" title="메모 있음" />
      )}
    </button>
  );
}
