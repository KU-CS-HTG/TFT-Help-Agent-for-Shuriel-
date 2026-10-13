import { getAllAugmentsLight, getAllDecks, getAllItemsWithExtras, getAllPatchVersions } from "@/lib/data";
import type { RecommendableAugment, RecommendableItem } from "@/lib/types";
import DecksPageClient from "@/components/DecksPageClient";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const [decks, allAugments, allItems, patchVersions] = await Promise.all([
    getAllDecks(),
    getAllAugmentsLight(),
    getAllItemsWithExtras(),
    getAllPatchVersions(),
  ]);

  // 추천 후보 풀에는 "미분류"(어느 스테이지에도 없는 증강체 / 티어에 배치하지
  // 않은 아이템)는 내놓지 않는다 — 사용자가 이미 정리를 끝낸 것들만 덱에
  // 추천으로 매달 수 있게.
  const recommendableAugments: RecommendableAugment[] = allAugments
    .filter((a) => a.stages.length > 0)
    .map((a) => ({ id: a.id, name: a.name, icon_url: a.icon_url, stages: a.stages }));
  const recommendableItems: RecommendableItem[] = allItems
    .filter((i) => i.placement !== null)
    .map((i) => ({ id: i.id, name: i.name, icon_url: i.icon_url, category: i.category }));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <BackLink />
      </div>
      <h1 className="text-lg font-semibold text-neutral-100">플레이할 만한 덱 종류</h1>
      <DecksPageClient
        initialDecks={decks}
        initialPatchVersions={patchVersions}
        recommendableAugments={recommendableAugments}
        recommendableItems={recommendableItems}
        allItems={allItems}
      />
    </div>
  );
}
