"use client";

import { useDroppable } from "@dnd-kit/core";

export default function RecommendationDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[3rem] flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 transition ${
        isOver ? "border-indigo-500 bg-neutral-800/70" : "border-neutral-700 bg-neutral-950"
      }`}
    >
      {children}
    </div>
  );
}
