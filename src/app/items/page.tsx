import { getAllItemsWithExtras } from "@/lib/data";
import BackLink from "@/components/BackLink";
import RefreshDataButton from "@/components/RefreshDataButton";
import ItemTierBoard from "@/components/ItemTierBoard";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const items = await getAllItemsWithExtras();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <BackLink />
        <RefreshDataButton />
      </header>
      <h1 className="mx-4 mt-3 text-lg font-semibold text-neutral-100">아이템 티어리스트</h1>
      <ItemTierBoard initialItems={items} />
    </div>
  );
}
