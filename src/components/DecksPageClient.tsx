"use client";

import { useState } from "react";
import type {
  DeckWithImages,
  ItemWithExtras,
  PatchVersionWithDeckIds,
  RecommendableAugment,
  RecommendableItem,
} from "@/lib/types";
import DeckAccordion from "./DeckAccordion";
import PatchVersionBoard from "./PatchVersionBoard";

interface Props {
  initialDecks: DeckWithImages[];
  initialPatchVersions: PatchVersionWithDeckIds[];
  recommendableAugments: RecommendableAugment[];
  recommendableItems: RecommendableItem[];
  allItems: ItemWithExtras[];
}

/**
 * 덱 목록(decks)의 상태를 여기서 소유해서, 아래쪽 "전체 덱 목록"
 * (DeckAccordion)에서 덱을 추가/이름 수정/삭제해도 위쪽 "패치 버전별
 * 할만한 덱"(PatchVersionBoard)의 드래그 후보 목록에 바로바로 반영되게 한다.
 */
export default function DecksPageClient({
  initialDecks,
  initialPatchVersions,
  recommendableAugments,
  recommendableItems,
  allItems,
}: Props) {
  const [decks, setDecks] = useState(initialDecks);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">패치 버전별 할만한 덱</h2>
        <PatchVersionBoard initialPatchVersions={initialPatchVersions} decks={decks} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">전체 덱 목록</h2>
        <DeckAccordion
          decks={decks}
          setDecks={setDecks}
          recommendableAugments={recommendableAugments}
          recommendableItems={recommendableItems}
          allItems={allItems}
        />
      </section>
    </div>
  );
}
