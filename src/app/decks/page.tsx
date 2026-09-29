import { getAllDecks } from "@/lib/data";
import DeckAccordion from "@/components/DeckAccordion";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function DecksPage() {
  const decks = await getAllDecks();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <BackLink />
      </div>
      <h1 className="text-lg font-semibold text-neutral-100">플레이할 만한 덱 종류</h1>
      <DeckAccordion initialDecks={decks} />
    </div>
  );
}
