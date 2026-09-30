"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  id: string;
  name: string;
  icon_url: string | null;
}

export default function DraggablePoolCard({ id, name, icon_url }: Props) {
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
