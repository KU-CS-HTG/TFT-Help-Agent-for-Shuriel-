import { notFound } from "next/navigation";
import { isStage } from "@/lib/constants";
import { getStageBoardData } from "@/lib/data";
import StageNav from "@/components/StageNav";
import TierBoard from "@/components/TierBoard";

export const dynamic = "force-dynamic";

export default async function StagePage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!isStage(stage)) notFound();

  const augments = await getStageBoardData(stage);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <StageNav />
      <TierBoard stage={stage} initialAugments={augments} />
    </div>
  );
}
