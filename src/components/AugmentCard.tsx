"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { AugmentWithExtras } from "@/lib/types";

interface Props {
  augment: AugmentWithExtras;
  dimmed: boolean;
  onSelect: (augment: AugmentWithExtras) => void;
}

export default function AugmentCard({ augment, dimmed, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: augment.id,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(augment)}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`relative flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 p-1.5 transition hover:border-indigo-500 ${
        isDragging ? "z-50 cursor-grabbing opacity-90 shadow-xl" : "cursor-grab"
      } ${dimmed ? "opacity-25 grayscale" : "opacity-100"}`}
      title={augment.name}
    >
      {augment.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={augment.icon_url}
          alt={augment.name}
          className="h-12 w-12 rounded object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded bg-neutral-700 text-center text-[9px] text-neutral-400">
          이미지 없음
        </div>
      )}
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-neutral-200">
        {augment.name}
      </span>
      {augment.note?.content && (
        <span
          className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-400"
          title="메모 있음"
        />
      )}
    </button>
  );
}
