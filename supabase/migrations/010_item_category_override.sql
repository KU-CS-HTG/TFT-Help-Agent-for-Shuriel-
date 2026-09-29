-- 사용자가 아이템 모달에서 분류(일반/유물/찬란/상징)를 직접 옮긴 경우,
-- "패치 데이터 새로고침"/npm run fetch:items가 그 값을 자동 추정 결과로
-- 덮어쓰면 안 됩니다. augments.description_game_overridden과 동일한 패턴.

alter table items add column if not exists category_overridden boolean not null default false;
