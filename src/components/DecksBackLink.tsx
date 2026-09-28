"use client";

import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/lib/unsavedChanges";

export default function DecksBackLink() {
  const router = useRouter();
  const { confirmLeave } = useUnsavedChanges();

  function handleBack() {
    if (!confirmLeave()) return;
    router.back();
  }

  return (
    <button type="button" onClick={handleBack} className="text-sm text-indigo-400 hover:text-indigo-300">
      ← 티어 보드로 돌아가기
    </button>
  );
}
