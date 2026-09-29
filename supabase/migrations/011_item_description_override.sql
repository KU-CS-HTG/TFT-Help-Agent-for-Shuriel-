-- 아이템 능력치 설명(official_desc)을 직접 수정할 수 있게 하고, 한 번 고친
-- 아이템은 이후 새로고침이 그 내용을 덮어쓰지 않도록 잠급니다.
-- augments.description_game_overridden과 동일한 패턴.

alter table items add column if not exists official_desc_overridden boolean not null default false;
