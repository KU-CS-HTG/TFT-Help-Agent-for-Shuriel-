-- 증강체는 등급(실버/골드/프리즘)에 따라 기본적으로 한 스테이지(2-1/3-2/4-2)에
-- 자동 배정되지만, 실제 게임에서는 조건에 따라 다른 스테이지에도 등장할 수
-- 있습니다. 이 컬럼에 추가로 등장하는 스테이지를 직접 채워 넣을 수 있게
-- 합니다. 기본 스테이지(augments.stage)는 패치 데이터 새로고침 때마다
-- 자동으로 갱신되지만, 이 컬럼은 사용자가 직접 관리하며 새로고침이 건드리지
-- 않습니다.
-- Supabase 프로젝트의 SQL Editor에서 실행하세요.

alter table augments
  add column if not exists extra_stages text[] not null default '{}';
