"use client";

import { useState, useTransition } from "react";
import type { Stage } from "@/lib/constants";
import type { AugmentLight } from "@/lib/data";
import type { AugmentWithExtras } from "@/lib/types";
import { updateStagesAction } from "@/lib/actions/stageMembershipActions";
import { fetchAugmentForStage } from "@/lib/actions/augmentQueryActions";

interface Props {
  stage: Stage;
  allAugments: AugmentLight[];
  onAdded: (augment: AugmentWithExtras) => void;
  onStagesChanged: (augmentId: string, stages: Stage[]) => void;
}

export default function AddAugmentPanel({ stage, allAugments, onAdded, onStagesChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const results =
    query.trim().length === 0
      ? []
      : allAugments.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30);

  function handleAdd(augment: AugmentLight) {
    setError(null);
    setAddingId(augment.id);
    const nextStages = [...augment.stages, stage];
    startTransition(async () => {
      try {
        await updateStagesAction(augment.id, nextStages);
        const full = await fetchAugmentForStage(augment.id, stage);
        onStagesChanged(augment.id, nextStages);
        onAdded(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "추가 실패");
      } finally {
        setAddingId(null);
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-900"
      >
        <span>+ 증강체 추가 (등급 미확인 등 어느 스테이지에도 없는 증강체 찾기)</span>
        <span className="text-xs text-neutral-500">{open ? "접기" : "펼치기"}</span>
      </button>

      {open && (
        <div className="border-t border-neutral-800 p-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="증강체 이름으로 검색..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          />

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          {results.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {results.map((a) => {
                const alreadyHere = a.stages.includes(stage);
                return (
                  <li key={a.id} className="flex items-center gap-2 rounded-lg bg-neutral-900 px-2 py-1.5">
                    {a.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.icon_url} alt={a.name} className="h-8 w-8 rounded" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-800 text-[8px] text-neutral-500">
                        없음
                      </div>
                    )}
                    <span className="flex-1 truncate text-sm text-neutral-200">{a.name}</span>
                    {a.stages.length > 0 && (
                      <span className="text-[10px] text-neutral-500">{a.stages.join(", ")}</span>
                    )}
                    <button
                      type="button"
                      disabled={alreadyHere || addingId === a.id}
                      onClick={() => handleAdd(a)}
                      className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-400"
                    >
                      {alreadyHere ? "이미 있음" : addingId === a.id ? "추가 중..." : "추가"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {query.trim().length > 0 && results.length === 0 && (
            <p className="mt-3 text-xs text-neutral-500">일치하는 증강체가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
