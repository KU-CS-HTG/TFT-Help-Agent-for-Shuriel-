-- 게임 내 설명을 사용자가 직접 수정할 수 있게 하고, 그 수정본이
-- "패치 데이터 새로고침"으로 덮어써지지 않도록 플래그를 추가합니다.
-- Supabase 프로젝트의 SQL Editor에서 실행하세요 (supabase/schema.sql을
-- 이미 적용한 뒤 한 번만 추가로 실행하면 됩니다).

alter table augments
  add column if not exists description_game_overridden boolean not null default false;
