import Link from "next/link";
import { notFound } from "next/navigation";
import { isStage } from "@/lib/constants";
import { getDecksForStage } from "@/lib/data";
import DeckAccordion from "@/components/DeckAccordion";

export const dynamic = "force-dynamic";

export default async function DecksPage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!isStage(stage)) notFound();

  const decks = await getDecksForStage(stage);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <Link href={`/${stage}`} className="text-sm text-indigo-400 hover:text-indigo-300">
          ← {stage} 티어 보드로 돌아가기
        </Link>
      </div>
      <h1 className="text-lg font-semibold text-neutral-100">{stage} 플레이할 만한 덱 종류</h1>
      <DeckAccordion stage={stage} initialDecks={decks} />
    </div>
  );
}
