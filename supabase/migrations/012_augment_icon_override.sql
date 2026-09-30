-- 증강체 아이콘을 직접 교체할 수 있게 하고, 한 번 고친 아이콘은 이후 "패치
-- 데이터 새로고침"이 Community Dragon 원본으로 덮어쓰지 않도록 잠급니다.
-- augments.description_game_overridden과 동일한 패턴.

alter table augments add column if not exists icon_url_overridden boolean not null default false;
alter table augments add column if not exists icon_storage_path text;
