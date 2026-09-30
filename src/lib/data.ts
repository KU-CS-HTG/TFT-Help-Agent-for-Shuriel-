import "server-only";
import { getSupabaseServerClient } from "./supabase";
import type { Stage } from "./constants";
import type {
  Augment,
  AugmentImage,
  AugmentNote,
  AugmentWithExtras,
  Deck,
  DeckRecommendedAugment,
  DeckRecommendedAugmentDisplay,
  DeckRecommendedItem,
  DeckRecommendedItemDisplay,
  DeckSubImage,
  DeckWithImages,
  Item,
  ItemNote,
  ItemTierPlacement,
  ItemWithExtras,
  StageNote,
  TierPlacement,
} from "./types";

export async function getStageBoardData(stage: Stage): Promise<AugmentWithExtras[]> {
  const supabase = getSupabaseServerClient();

  // stages 배열에 이 스테이지가 포함된 증강체만 가져온다. stages는 사용자가
  // 체크박스로 직접 관리하는 값이라(등급 기반 자동 배정 없음, 기본은 빈 배열)
  // 같은 증강체가 여러 스테이지 풀에 동시에 등장할 수도, 아무 데도 안 나타날
  // 수도 있다.
  const { data: augments, error } = await supabase
    .from("augments")
    .select("*")
    .contains("stages", [stage])
    .order("name");
  if (error) throw new Error(error.message);
  if (!augments || augments.length === 0) return [];

  const ids = (augments as Augment[]).map((a) => a.id);

  const [placementsRes, notesRes, imagesRes] = await Promise.all([
    supabase.from("tier_placements").select("*").eq("stage", stage).in("augment_id", ids),
    supabase.from("augment_notes").select("*").eq("stage", stage).in("augment_id", ids),
    supabase.from("augment_images").select("*").in("augment_id", ids).order("position"),
  ]);

  if (placementsRes.error) throw new Error(placementsRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);
  if (imagesRes.error) throw new Error(imagesRes.error.message);

  const placementMap = new Map<string, TierPlacement>(
    ((placementsRes.data as TierPlacement[]) ?? []).map((p) => [p.augment_id, p])
  );
  const noteMap = new Map<string, AugmentNote>(
    ((notesRes.data as AugmentNote[]) ?? []).map((n) => [n.augment_id, n])
  );
  const imagesMap = new Map<string, AugmentImage[]>();
  for (const img of (imagesRes.data as AugmentImage[]) ?? []) {
    const list = imagesMap.get(img.augment_id) ?? [];
    list.push(img);
    imagesMap.set(img.augment_id, list);
  }

  return (augments as Augment[]).map((a) => ({
    ...a,
    placement: placementMap.get(a.id) ?? null,
    note: noteMap.get(a.id) ?? null,
    images: imagesMap.get(a.id) ?? [],
  }));
}

export interface AugmentLight {
  id: string;
  name: string;
  icon_url: string | null;
  stages: Stage[];
}

/**
 * 스테이지 배정과 무관하게 전체 증강체를 가볍게 가져온다. stages가 비어있는
 * (아직 어느 스테이지에도 체크 안 된) 증강체를 찾아서 추가할 수 있게 하는
 * "증강체 추가" 검색 패널용 — 이게 없으면 stages가 빈 증강체는 어느 보드에도
 * 안 보여서 체크할 방법이 없다.
 */
export async function getAllAugmentsLight(): Promise<AugmentLight[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("augments")
    .select("id, name, icon_url, stages")
    .order("name");
  if (error) throw new Error(error.message);

  return (data ?? []) as AugmentLight[];
}

/** 스테이지 전체에 대한 전략 메모를 가져온다. 아직 작성한 적 없으면 null. */
export async function getStageNote(stage: Stage): Promise<StageNote | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.from("stage_notes").select("*").eq("stage", stage).maybeSingle();
  if (error) throw new Error(error.message);

  return (data as StageNote | null) ?? null;
}

/**
 * "플레이할 만한 덱" 목록(스테이지 구분 없는 공용 목록)을 서브 이미지 +
 * 추천 증강체/아이템까지 채워서 가져온다. 추천 증강체/아이템은 연결 테이블만
 * 봐서는 이름/아이콘을 알 수 없어서, 관련 augments/items 테이블에서 한 번
 * 더 가져와 JS에서 합친다(다른 함수들과 동일한 방식 — supabase-js 임베디드
 * 조인은 이 프로젝트의 손으로 쓴 Database 타입에 관계 메타데이터가 없어
 * 타입이 안 맞는다).
 */
export async function getAllDecks(): Promise<DeckWithImages[]> {
  const supabase = getSupabaseServerClient();

  const { data: decks, error } = await supabase.from("decks").select("*").order("position").order("created_at");
  if (error) throw new Error(error.message);
  if (!decks || decks.length === 0) return [];

  const ids = (decks as Deck[]).map((d) => d.id);

  const [subImagesRes, recAugmentsRes, recItemsRes] = await Promise.all([
    supabase.from("deck_sub_images").select("*").in("deck_id", ids).order("position"),
    supabase.from("deck_recommended_augments").select("*").in("deck_id", ids).order("position"),
    supabase.from("deck_recommended_items").select("*").in("deck_id", ids).order("position"),
  ]);
  if (subImagesRes.error) throw new Error(subImagesRes.error.message);
  if (recAugmentsRes.error) throw new Error(recAugmentsRes.error.message);
  if (recItemsRes.error) throw new Error(recItemsRes.error.message);

  const recAugments = (recAugmentsRes.data as DeckRecommendedAugment[]) ?? [];
  const recItems = (recItemsRes.data as DeckRecommendedItem[]) ?? [];

  const augmentIds = [...new Set(recAugments.map((r) => r.augment_id))];
  const itemIds = [...new Set(recItems.map((r) => r.item_id))];

  const [augmentsLightRes, itemsLightRes] = await Promise.all([
    augmentIds.length > 0
      ? supabase.from("augments").select("id, name, icon_url").in("id", augmentIds)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length > 0
      ? supabase.from("items").select("id, name, icon_url, category").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (augmentsLightRes.error) throw new Error(augmentsLightRes.error.message);
  if (itemsLightRes.error) throw new Error(itemsLightRes.error.message);

  const augmentInfoMap = new Map<string, { name: string; icon_url: string | null }>(
    (augmentsLightRes.data as Array<{ id: string; name: string; icon_url: string | null }>).map((a) => [
      a.id,
      { name: a.name, icon_url: a.icon_url },
    ])
  );
  const itemInfoMap = new Map<string, { name: string; icon_url: string | null; category: Item["category"] }>(
    (itemsLightRes.data as Array<{ id: string; name: string; icon_url: string | null; category: Item["category"] }>).map(
      (i) => [i.id, { name: i.name, icon_url: i.icon_url, category: i.category }]
    )
  );

  const subImagesMap = new Map<string, DeckSubImage[]>();
  for (const img of (subImagesRes.data as DeckSubImage[]) ?? []) {
    const list = subImagesMap.get(img.deck_id) ?? [];
    list.push(img);
    subImagesMap.set(img.deck_id, list);
  }

  const recAugmentsMap = new Map<string, DeckRecommendedAugmentDisplay[]>();
  for (const r of recAugments) {
    const info = augmentInfoMap.get(r.augment_id);
    if (!info) continue; // 증강체가 그 사이 삭제된 경우 등 — 조용히 건너뜀
    const list = recAugmentsMap.get(r.deck_id) ?? [];
    list.push({ augment_id: r.augment_id, name: info.name, icon_url: info.icon_url });
    recAugmentsMap.set(r.deck_id, list);
  }

  const recItemsMap = new Map<string, DeckRecommendedItemDisplay[]>();
  for (const r of recItems) {
    const info = itemInfoMap.get(r.item_id);
    if (!info) continue;
    const list = recItemsMap.get(r.deck_id) ?? [];
    list.push({ item_id: r.item_id, name: info.name, icon_url: info.icon_url, category: info.category });
    recItemsMap.set(r.deck_id, list);
  }

  return (decks as Deck[]).map((d) => ({
    ...d,
    subImages: subImagesMap.get(d.id) ?? [],
    recommendedAugments: recAugmentsMap.get(d.id) ?? [],
    recommendedItems: recItemsMap.get(d.id) ?? [],
  }));
}

/** 아이템 티어리스트 전체(일반/유물/찬란 공용, 카테고리별로 클라이언트에서 나눠 씀)를 가져온다. */
export async function getAllItemsWithExtras(): Promise<ItemWithExtras[]> {
  const supabase = getSupabaseServerClient();

  const { data: items, error } = await supabase.from("items").select("*").order("name");
  if (error) throw new Error(error.message);
  if (!items || items.length === 0) return [];

  const ids = (items as Item[]).map((i) => i.id);

  const [placementsRes, notesRes] = await Promise.all([
    supabase.from("item_tier_placements").select("*").in("item_id", ids),
    supabase.from("item_notes").select("*").in("item_id", ids),
  ]);
  if (placementsRes.error) throw new Error(placementsRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);

  const placementMap = new Map<string, ItemTierPlacement>(
    ((placementsRes.data as ItemTierPlacement[]) ?? []).map((p) => [p.item_id, p])
  );
  const noteMap = new Map<string, ItemNote>(((notesRes.data as ItemNote[]) ?? []).map((n) => [n.item_id, n]));

  return (items as Item[]).map((i) => ({
    ...i,
    placement: placementMap.get(i.id) ?? null,
    note: noteMap.get(i.id) ?? null,
  }));
}
