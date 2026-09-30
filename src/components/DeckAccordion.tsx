"use client";

import { useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { isRecommendTier, type RecommendTier } from "@/lib/constants";
import type { DeckWithImages, RecommendableAugment, RecommendableItem } from "@/lib/types";
import { createDeckAction } from "@/lib/actions/deckActions";
import {
  addRecommendedAugmentAction,
  addRecommendedItemAction,
  removeRecommendedAugmentAction,
  removeRecommendedItemAction,
} from "@/lib/actions/deckRecommendationActions";
import DeckItem from "./DeckItem";

interface Props {
  initialDecks: DeckWithImages[];
  recommendableAugments: RecommendableAugment[];
  recommendableItems: RecommendableItem[];
}

export default function DeckAccordion({ initialDecks, recommendableAugments, recommendableItems }: Props) {
  const [decks, setDecks] = useState(initialDecks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createDeckAction(trimmed);
        setDecks((prev) => [...prev, { ...created, subImages: [], recommendedAugments: [], recommendedItems: [] }]);
        setNewName("");
        setExpandedId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가 실패");
      }
    });
  }

  function handleUpdate(updated: DeckWithImages) {
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleDelete(deckId: string) {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    setExpandedId((prev) => (prev === deckId ? null : prev));
  }

  function handleAddRecommendedAugment(deckId: string, augmentId: string, tier: RecommendTier) {
    const augment = recommendableAugments.find((a) => a.id === augmentId);
    if (!augment) return;
    setError(null);

    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        const withoutExisting = d.recommendedAugments.filter((r) => r.augment_id !== augmentId);
        return {
          ...d,
          recommendedAugments: [
            ...withoutExisting,
            { augment_id: augmentId, name: augment.name, icon_url: augment.icon_url, recommend_tier: tier },
          ],
        };
      })
    );

    startTransition(() => {
      addRecommendedAugmentAction(deckId, augmentId, tier).catch((err) => {
        setError(err instanceof Error ? err.message : "추가 실패");
        setDecks((prev) =>
          prev.map((d) =>
            d.id === deckId
              ? { ...d, recommendedAugments: d.recommendedAugments.filter((r) => r.augment_id !== augmentId) }
              : d
          )
        );
      });
    });
  }

  function handleAddRecommendedItem(deckId: string, itemId: string, tier: RecommendTier) {
    const item = recommendableItems.find((i) => i.id === itemId);
    if (!item) return;
    setError(null);

    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        const withoutExisting = d.recommendedItems.filter((r) => r.item_id !== itemId);
        return {
          ...d,
          recommendedItems: [
            ...withoutExisting,
            { item_id: itemId, name: item.name, icon_url: item.icon_url, category: item.category, recommend_tier: tier },
          ],
        };
      })
    );

    startTransition(() => {
      addRecommendedItemAction(deckId, itemId, tier).catch((err) => {
        setError(err instanceof Error ? err.message : "추가 실패");
        setDecks((prev) =>
          prev.map((d) =>
            d.id === deckId ? { ...d, recommendedItems: d.recommendedItems.filter((r) => r.item_id !== itemId) } : d
          )
        );
      });
    });
  }

  function handleRemoveRecommendedAugment(deckId: string, augmentId: string) {
    setError(null);
    const deck = decks.find((d) => d.id === deckId);
    const removed = deck?.recommendedAugments.find((r) => r.augment_id === augmentId);

    setDecks((prev) =>
      prev.map((d) =>
        d.id === deckId ? { ...d, recommendedAugments: d.recommendedAugments.filter((r) => r.augment_id !== augmentId) } : d
      )
    );

    startTransition(() => {
      removeRecommendedAugmentAction(deckId, augmentId).catch((err) => {
        setError(err instanceof Error ? err.message : "삭제 실패");
        if (removed) {
          setDecks((prev) =>
            prev.map((d) => (d.id === deckId ? { ...d, recommendedAugments: [...d.recommendedAugments, removed] } : d))
          );
        }
      });
    });
  }

  function handleRemoveRecommendedItem(deckId: string, itemId: string) {
    setError(null);
    const deck = decks.find((d) => d.id === deckId);
    const removed = deck?.recommendedItems.find((r) => r.item_id === itemId);

    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, recommendedItems: d.recommendedItems.filter((r) => r.item_id !== itemId) } : d))
    );

    startTransition(() => {
      removeRecommendedItemAction(deckId, itemId).catch((err) => {
        setError(err instanceof Error ? err.message : "삭제 실패");
        if (removed) {
          setDecks((prev) => prev.map((d) => (d.id === deckId ? { ...d, recommendedItems: [...d.recommendedItems, removed] } : d)));
        }
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 드롭존 id 형식: "deck-augments:<deckId>:<tier>" / "deck-items:<deckId>:<tier>"
    if (activeId.startsWith("pool-augment:") && overId.startsWith("deck-augments:")) {
      const [, deckId, tier] = overId.split(":");
      if (!deckId || !isRecommendTier(tier)) return;
      handleAddRecommendedAugment(deckId, activeId.slice("pool-augment:".length), tier);
    } else if (activeId.startsWith("pool-item:") && overId.startsWith("deck-items:")) {
      const [, deckId, tier] = overId.split(":");
      if (!deckId || !isRecommendTier(tier)) return;
      handleAddRecommendedItem(deckId, activeId.slice("pool-item:".length), tier);
    }
  }

  return (
    <DndContext id="deck-recommendation-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="새 덱 이름"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={handleAdd}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            + 덱 추가
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {decks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-6 text-center">
            <p className="text-sm text-neutral-400">아직 등록한 덱이 없어요. 덱을 추가해보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {decks.map((deck) => (
              <DeckItem
                key={deck.id}
                deck={deck}
                expanded={expandedId === deck.id}
                onToggle={() => setExpandedId((prev) => (prev === deck.id ? null : deck.id))}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onRemoveRecommendedAugment={handleRemoveRecommendedAugment}
                onRemoveRecommendedItem={handleRemoveRecommendedItem}
                recommendableAugments={recommendableAugments}
                recommendableItems={recommendableItems}
              />
            ))}
          </div>
        )}
      </div>
    </DndContext>
  );
}
