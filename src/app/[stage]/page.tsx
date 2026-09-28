import Link from "next/link";
import { notFound } from "next/navigation";
import { isStage } from "@/lib/constants";
import { getAllAugmentsLight, getStageBoardData, getStageNote } from "@/lib/data";
import StageNav from "@/components/StageNav";
import StageNoteEditor from "@/components/StageNoteEditor";
import TierBoard from "@/components/TierBoard";

export const dynamic = "force-dynamic";

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!isStage(stage)) notFound();

  const [augments, allAugments, stageNote] = await Promise.all([
    getStageBoardData(stage),
    getAllAugmentsLight(),
    getStageNote(stage),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <StageNav />
      <StageNoteEditor stage={stage} initialNote={stageNote} />
      <Link
        href={`/decks/${stage}`}
        className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-3 hover:border-indigo-600 hover:bg-neutral-800"
      >
        <span className="text-sm font-semibold text-neutral-200">{stage} 플레이할 만한 덱 종류</span>
        <span className="text-neutral-500">→</span>
      </Link>
      <TierBoard stage={stage} initialAugments={augments} allAugments={allAugments} />
    </div>
  );
}
