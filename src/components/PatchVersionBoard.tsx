"use client";

import { useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { DeckSummary, PatchVersionWithDeckIds } from "@/lib/types";
import {
  addDeckToPatchAction,
  createPatchVersionAction,
  deletePatchVersionAction,
  removeDeckFromPatchAction,
  renamePatchVersionAction,
} from "@/lib/actions/patchVersionActions";
import PatchVersionCard from "./PatchVersionCard";

interface Props {
  initialPatchVersions: PatchVersionWithDeckIds[];
  decks: DeckSummary[];
}

export default function PatchVersionBoard({ initialPatchVersions, decks }: Props) {
  const [patchVersions, setPatchVersions] = useState(initialPatchVersions);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const deckMap = new Map(decks.map((d) => [d.id, d]));

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createPatchVersionAction(trimmed);
        setPatchVersions((prev) => [...prev, { ...created, deckIds: [] }]);
        setNewName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가 실패");
      }
    });
  }

  function handleRename(patchVersionId: string, name: string) {
    setError(null);
    const prevName = patchVersions.find((p) => p.id === patchVersionId)?.name;
    setPatchVersions((prev) => prev.map((p) => (p.id === patchVersionId ? { ...p, name } : p)));

    startTransition(async () => {
      try {
        await renamePatchVersionAction(patchVersionId, name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "수정 실패");
        if (prevName !== undefined) {
          setPatchVersions((prev) => prev.map((p) => (p.id === patchVersionId ? { ...p, name: prevName } : p)));
        }
      }
    });
  }

  function handleDelete(patchVersionId: string) {
    setError(null);
    const removed = patchVersions.find((p) => p.id === patchVersionId);
    setPatchVersions((prev) => prev.filter((p) => p.id !== patchVersionId));

    startTransition(async () => {
      try {
        await deletePatchVersionAction(patchVersionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
        if (removed) setPatchVersions((prev) => [...prev, removed]);
      }
    });
  }

  function handleAddDeck(patchVersionId: string, deckId: string) {
    setError(null);
    setPatchVersions((prev) =>
      prev.map((p) =>
        p.id === patchVersionId && !p.deckIds.includes(deckId) ? { ...p, deckIds: [...p.deckIds, deckId] } : p
      )
    );

    startTransition(async () => {
      try {
        await addDeckToPatchAction(patchVersionId, deckId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가 실패");
        setPatchVersions((prev) =>
          prev.map((p) => (p.id === patchVersionId ? { ...p, deckIds: p.deckIds.filter((id) => id !== deckId) } : p))
        );
      }
    });
  }

  function handleRemoveDeck(patchVersionId: string, deckId: string) {
    setError(null);
    const removedFrom = patchVersions.find((p) => p.id === patchVersionId);
    const hadDeck = removedFrom?.deckIds.includes(deckId) ?? false;
    setPatchVersions((prev) =>
      prev.map((p) => (p.id === patchVersionId ? { ...p, deckIds: p.deckIds.filter((id) => id !== deckId) } : p))
    );

    startTransition(async () => {
      try {
        await removeDeckFromPatchAction(patchVersionId, deckId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패");
        if (hadDeck) {
          setPatchVersions((prev) =>
            prev.map((p) =>
              p.id === patchVersionId && !p.deckIds.includes(deckId) ? { ...p, deckIds: [...p.deckIds, deckId] } : p
            )
          );
        }
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 드롭존 id 형식: "patch-decks:<patchVersionId>"
    if (activeId.startsWith("pool-deck:") && overId.startsWith("patch-decks:")) {
      const patchVersionId = overId.slice("patch-decks:".length);
      const deckId = activeId.slice("pool-deck:".length);
      handleAddDeck(patchVersionId, deckId);
    }
  }

  return (
    <DndContext id="patch-version-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="새 패치 버전 이름 (예: 18.2b)"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={handleAdd}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            + 패치 버전 추가
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}

        {patchVersions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900 p-6 text-center">
            <p className="text-sm text-neutral-400">아직 등록한 패치 버전이 없어요. 패치 버전을 추가해보세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {patchVersions.map((p) => {
              const assignedDecks = p.deckIds
                .map((id) => deckMap.get(id))
                .filter((d): d is DeckSummary => Boolean(d));
              const assignedIds = new Set(p.deckIds);
              const pool = decks.filter((d) => !assignedIds.has(d.id));
              return (
                <PatchVersionCard
                  key={p.id}
                  patchVersionId={p.id}
                  name={p.name}
                  assignedDecks={assignedDecks}
                  pool={pool}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onRemoveDeck={handleRemoveDeck}
                />
              );
            })}
          </div>
        )}
      </div>
    </DndContext>
  );
}
