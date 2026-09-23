-- 등급(실버/골드/프리즘) 기준으로 자동 배정되던 기본 스테이지를 더 이상
-- "고정 체크"로 취급하지 않습니다. 대신 이 컬럼 하나가 "이 증강체가 실제로
-- 등장하는 스테이지 전부"를 나타내고, 세 체크박스 모두 자유롭게 켜고 끌 수
-- 있습니다(전부 꺼진 상태 = 아직 어느 스테이지에서도 확인 안 됨, 도 유효한
-- 상태).
--
-- 기존에 자동 배정됐던 기본 스테이지(augments.stage)와 이미 체크해두신
-- extra_stages는 한 번만 합쳐서 이 컬럼으로 옮겨줍니다 — 이미 해두신 설정을
-- 잃지 않기 위함입니다. stages가 비어있는 행에 대해서만 실행되므로 여러 번
-- 실행해도 안전합니다.
--
-- Supabase 프로젝트의 SQL Editor에서 실행하세요.

alter table augments
  add column if not exists stages text[] not null default '{}';

update augments
set stages = (select array_agg(distinct s) from unnest(array[stage] || extra_stages) as s)
where stages = '{}';
