-- 개인 메모를 증강체 하나당 공통 메모가 아니라, 스테이지(2-1/3-2/4-2)별로
-- 독립적으로 관리합니다. tier_placements가 이미 (augment_id, stage) 단위로
-- 독립적인 것과 같은 방식입니다.
--
-- 기존에 작성해두신 메모는 그 증강체가 등장하는 스테이지 중 가장 빠른 것
-- (2-1 > 3-2 > 4-2 순, 문자열 최소값과 우연히 일치)으로 옮겨줍니다. 어느
-- 스테이지에도 체크되어 있지 않은 증강체의 메모는 2-1로 옮깁니다(안전한
-- 기본값 — 실제로는 모달을 통해서만 메모를 쓸 수 있어 이 경우는 거의
-- 없을 것으로 예상됩니다).
--
-- Supabase 프로젝트의 SQL Editor에서 실행하세요.

alter table augment_notes
  add column if not exists stage text check (stage in ('2-1', '3-2', '4-2'));

update augment_notes n
set stage = coalesce(
  (select min(s) from augments a, unnest(a.stages) as s where a.id = n.augment_id),
  '2-1'
)
where stage is null;

alter table augment_notes alter column stage set not null;

alter table augment_notes drop constraint if exists augment_notes_pkey;
alter table augment_notes add primary key (augment_id, stage);
