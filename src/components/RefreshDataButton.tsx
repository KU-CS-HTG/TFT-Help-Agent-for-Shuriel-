"use client";

import { useState, useTransition } from "react";
import { refreshDataAction } from "@/lib/actions/refreshActions";

export default function RefreshDataButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const summary = await refreshDataAction();
        setMessage(
          `완료: 총 ${summary.total}개 (실버 ${summary.bySilverGoldPrism.silver} / 골드 ${summary.bySilverGoldPrism.gold} / 프리즘 ${summary.bySilverGoldPrism.prism}), 아이콘 못찾음 ${summary.iconsMissing}건`
        );
      } catch (err) {
        setMessage(err instanceof Error ? `오류: ${err.message}` : "알 수 없는 오류");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        {pending ? "새로고침 중..." : "패치 데이터 새로고침"}
      </button>
      {message && <span className="max-w-xs truncate text-xs text-neutral-400" title={message}>{message}</span>}
    </div>
  );
}
