-- 아이템 카테고리에 "상징"(trait emblem) 추가. 지금까지는 상징 아이템도
-- 조합 재료 2개로 만들어진다는 이유로 "일반"으로 분류되고 있었는데, 사용자
-- 요청으로 독립된 4번째 카테고리로 분리합니다.

alter table items drop constraint if exists items_category_check;
alter table items add constraint items_category_check
  check (category in ('normal', 'artifact', 'radiant', 'trait'));
