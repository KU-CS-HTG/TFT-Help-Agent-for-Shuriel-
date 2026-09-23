"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGES } from "@/lib/constants";
import RefreshDataButton from "./RefreshDataButton";

export default function StageNav() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="flex items-center gap-2">
        {STAGES.map((stage) => {
          const active = pathname === `/${stage}`;
          return (
            <Link
              key={stage}
              href={`/${stage}`}
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
      <div className="flex items-center gap-2">
        <RefreshDataButton />
      </div>
    </header>
  );
}
