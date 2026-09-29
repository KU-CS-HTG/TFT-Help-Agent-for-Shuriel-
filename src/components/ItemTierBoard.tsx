"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABEL, ITEM_TIERS, type ItemCategory, type ItemTier } from "@/lib/constants";
import type { ItemWithExtras } from "@/lib/types";
import { deleteItemsAction } from "@/lib/actions/itemActions";
import { updateItemPlacementAction } from "@/lib/actions/itemTierActions";
import ItemTierRow from "./ItemTierRow";
import ItemUnplacedPool from "./ItemUnplacedPool";
import SearchBar from "./SearchBar";
import ItemModal from "./ItemModal";

interface Props {
  initialItems: ItemWithExtras[];
}

export default function ItemTierBoard({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<ItemCategory>("normal");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const itemsInCategory = useMemo(() => items.filter((i) => i.category === category), [items, category]);

  const byTier = useMemo(() => {
    const map: Record<ItemTier, ItemWithExtras[]> = { S: [], A: [], B: [], C: [] };
    for (const i of itemsInCategory) {
      if (i.placement) map[i.placement.tier].push(i);
    }
    return map;
  }, [itemsInCategory]);

  const unplaced = useMemo(() => itemsInCategory.filter((i) => !i.placement), [itemsInCategory]);
  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  function matchesSearch(item: ItemWithExtras) {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return item.name.toLowerCase().includes(term);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const overId = String(over.id);
    const targetTier: ItemTier | null =
      overId === "item-unplaced" ? null : (overId.replace("item-tier:", "") as ItemTier);

    const current = items.find((i) => i.id === itemId);
    if (!current) return;
    const currentTier = current.placement?.tier ?? null;
    if (currentTier === targetTier) return;

    const previous = current;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              placement: targetTier
                ? {
                    id: i.placement?.id ?? "temp",
                    item_id: i.id,
                    tier: targetTier,
                    position: 0,
                    updated_at: new Date().toISOString(),
                  }
                : null,
            }
          : i
      )
    );

    startTransition(() => {
      updateItemPlacementAction(itemId, targetTier).catch(() => {
        setItems((prev) => prev.map((i) => (i.id === itemId ? previous : i)));
      });
    });
  }

  function handleItemUpdate(updated: ItemWithExtras) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleItemDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedId(null);
  }

  function handleBulkDeleteUnplaced() {
    if (unplaced.length === 0) return;
    const label = ITEM_CATEGORY_LABEL[category];
    if (
      !window.confirm(
        `"${label}" 탭에서 티어에 배치하지 않은 아이템 ${unplaced.length}개를 모두 삭제할까요? 되돌릴 수 없습니다.`
      )
    )
      return;

    setBulkError(null);
    const idsToDelete = new Set(unplaced.map((i) => i.id));
    startBulkTransition(async () => {
      try {
        await deleteItemsAction([...idsToDelete]);
        setItems((prev) => prev.filter((i) => !idsToDelete.has(i.id)));
      } catch (err) {
        setBulkError(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {ITEM_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              category === c ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {ITEM_CATEGORY_LABEL[c]} ({items.filter((i) => i.category === c).length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="아이템 이름 검색..." />
        <button
          type="button"
          disabled={bulkPending || unplaced.length === 0}
          onClick={handleBulkDeleteUnplaced}
          title="이 카테고리에서 티어에 배치하지 않은(미분류) 아이템을 한 번에 삭제합니다."
          className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-red-300 hover:bg-neutral-700 disabled:opacity-50"
        >
          {bulkPending ? "삭제 중..." : `미분류 아이템 일괄 삭제 (${unplaced.length})`}
        </button>
      </div>
      {bulkError && <p className="text-sm text-red-400">{bulkError}</p>}

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-neutral-400">
          <p className="text-lg font-medium">등록된 아이템이 없습니다.</p>
          <p className="text-sm">
            우측 상단 &quot;패치 데이터 새로고침&quot; 버튼을 눌러 Community Dragon에서 아이템 데이터를 가져오거나,
            <br />
            네트워크가 제한된 환경이라면 <code>npm run seed:sample-items</code>로 더미 데이터를 넣어 화면을 확인해보세요.
          </p>
        </div>
      ) : itemsInCategory.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-neutral-400">
          <p className="text-lg font-medium">{ITEM_CATEGORY_LABEL[category]} 분류에 등록된 아이템이 없습니다.</p>
        </div>
      ) : (
        <>
          <DndContext id={`item-tier-board-${category}`} sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="overflow-hidden rounded-xl border border-neutral-800">
              {ITEM_TIERS.map((tier) => (
                <ItemTierRow
                  key={tier}
                  tier={tier}
                  items={byTier[tier]}
                  matchesSearch={matchesSearch}
                  onSelect={(i) => setSelectedId(i.id)}
                />
              ))}
            </div>

            <ItemUnplacedPool items={unplaced} matchesSearch={matchesSearch} onSelect={(i) => setSelectedId(i.id)} />
          </DndContext>

          {selected && (
            <ItemModal
              item={selected}
              onClose={() => setSelectedId(null)}
              onUpdate={handleItemUpdate}
              onDelete={handleItemDelete}
            />
          )}
        </>
      )}
    </div>
  );
}
