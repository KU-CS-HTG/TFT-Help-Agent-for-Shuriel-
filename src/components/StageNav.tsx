"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGES } from "@/lib/constants";
import { useUnsavedChanges } from "@/lib/unsavedChanges";
import RefreshDataButton from "./RefreshDataButton";

export default function StageNav() {
  const pathname = usePathname();
  const { confirmLeave } = useUnsavedChanges();

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!confirmLeave()) e.preventDefault();
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-neutral-100">TFT 개인 맞춤형 도우미 에이전트</span>
        <div className="flex items-center gap-2">
          {STAGES.map((stage) => {
            const active = pathname === `/${stage}`;
            return (
              <Link
                key={stage}
                href={`/${stage}`}
                onClick={handleNavClick}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {stage}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RefreshDataButton />
      </div>
    </header>
  );
}
