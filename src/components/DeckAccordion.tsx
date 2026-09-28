"use client";

import { useState, useTransition } from "react";
import type { DeckWithImages } from "@/lib/types";
import { createDeckAction } from "@/lib/actions/deckActions";
import DeckItem from "./DeckItem";

interface Props {
  initialDecks: DeckWithImages[];
}

export default function DeckAccordion({ initialDecks }: Props) {
  const [decks, setDecks] = useState(initialDecks);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createDeckAction(trimmed);
        setDecks((prev) => [...prev, { ...created, subImages: [] }]);
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

  return (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
