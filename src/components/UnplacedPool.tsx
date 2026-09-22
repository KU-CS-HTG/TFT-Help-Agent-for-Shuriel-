"use client";

import { useDroppable } from "@dnd-kit/core";
import type { AugmentWithExtras } from "@/lib/types";
import AugmentCard from "./AugmentCard";

interface Props {
  augments: AugmentWithExtras[];
  matchesSearch: (augment: AugmentWithExtras) => boolean;
  onSelect: (augment: AugmentWithExtras) => void;
}

export default function UnplacedPool({ augments, matchesSearch, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "unplaced" });

  return (
    <div className="rounded-xl border border-neutral-800">
      <div className="border-b border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-semibold text-neutral-400">
        미분류 ({augments.length})
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[8rem] flex-wrap gap-2 p-3 transition ${
          isOver ? "bg-neutral-800/70" : "bg-neutral-900/50"
        }`}
      >
        {augments.map((a) => (
          <AugmentCard key={a.id} augment={a} dimmed={!matchesSearch(a)} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
