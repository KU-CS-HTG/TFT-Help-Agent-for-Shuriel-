"use client";

import { useDroppable } from "@dnd-kit/core";
import { TIER_COLOR, type Tier } from "@/lib/constants";
import type { AugmentWithExtras } from "@/lib/types";
import AugmentCard from "./AugmentCard";

interface Props {
  tier: Tier;
  augments: AugmentWithExtras[];
  matchesSearch: (augment: AugmentWithExtras) => boolean;
  onSelect: (augment: AugmentWithExtras) => void;
}

export default function TierRow({ tier, augments, matchesSearch, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier:${tier}` });

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
        {augments.map((a) => (
          <AugmentCard key={a.id} augment={a} dimmed={!matchesSearch(a)} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
