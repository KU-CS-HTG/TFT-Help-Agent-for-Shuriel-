"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { TIERS, type Stage, type Tier } from "@/lib/constants";
import type { AugmentWithExtras } from "@/lib/types";
import { updatePlacementAction } from "@/lib/actions/tierActions";
import TierRow from "./TierRow";
import UnplacedPool from "./UnplacedPool";
import SearchBar from "./SearchBar";
import AugmentModal from "./AugmentModal";

interface Props {
  stage: Stage;
  initialAugments: AugmentWithExtras[];
}

export default function TierBoard({ stage, initialAugments }: Props) {
  const [augments, setAugments] = useState(initialAugments);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byTier = useMemo(() => {
    const map: Record<Tier, AugmentWithExtras[]> = { S: [], A: [], B: [], C: [], D: [] };
    for (const a of augments) {
      if (a.placement) map[a.placement.tier].push(a);
    }
    return map;
  }, [augments]);

  const unplaced = useMemo(() => augments.filter((a) => !a.placement), [augments]);
  const selected = useMemo(() => augments.find((a) => a.id === selectedId) ?? null, [augments, selectedId]);

  function matchesSearch(augment: AugmentWithExtras) {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return augment.name.toLowerCase().includes(term);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const augmentId = String(active.id);
    const overId = String(over.id);
    const targetTier: Tier | null = overId === "unplaced" ? null : (overId.replace("tier:", "") as Tier);

    const current = augments.find((a) => a.id === augmentId);
    if (!current) return;
    const currentTier = current.placement?.tier ?? null;
    if (currentTier === targetTier) return;

    const previous = current;

    setAugments((prev) =>
      prev.map((a) =>
        a.id === augmentId
          ? {
              ...a,
              placement: targetTier
                ? {
                    id: a.placement?.id ?? "temp",
                    augment_id: a.id,
                    stage,
                    tier: targetTier,
                    position: 0,
                    updated_at: new Date().toISOString(),
                  }
                : null,
            }
          : a
      )
    );

    startTransition(() => {
      updatePlacementAction(augmentId, stage, targetTier).catch(() => {
        setAugments((prev) => prev.map((a) => (a.id === augmentId ? previous : a)));
      });
    });
  }

  function handleAugmentUpdate(updated: AugmentWithExtras) {
    setAugments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  if (augments.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-neutral-400">
        <p className="text-lg font-medium">이 스테이지에 등록된 증강체가 없습니다.</p>
        <p className="text-sm">
          우측 상단의 &quot;패치 데이터 새로고침&quot; 버튼을 누르거나, <br />
          네트워크가 제한된 환경이라면 <code className="rounded bg-neutral-800 px-1">npm run seed:sample</code> 로
          샘플 데이터를 넣어보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <SearchBar value={search} onChange={setSearch} />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          {TIERS.map((tier) => (
            <TierRow
              key={tier}
              tier={tier}
              augments={byTier[tier]}
              matchesSearch={matchesSearch}
              onSelect={(a) => setSelectedId(a.id)}
            />
          ))}
        </div>

        <UnplacedPool augments={unplaced} matchesSearch={matchesSearch} onSelect={(a) => setSelectedId(a.id)} />
      </DndContext>

      {selected && (
        <AugmentModal
          augment={selected}
          stage={stage}
          onClose={() => setSelectedId(null)}
          onUpdate={handleAugmentUpdate}
        />
      )}
    </div>
  );
}
