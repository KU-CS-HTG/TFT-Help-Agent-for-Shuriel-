-- TFT 증강체 티어 정리 에이전트 - DB 스키마
-- Supabase 프로젝트의 SQL Editor에서 이 파일 전체를 한 번 실행하세요.

create extension if not exists "pgcrypto";

-- 증강체 원본 데이터 (Community Dragon에서 가져와 캐싱)
create table if not exists augments (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique,
  name text not null,
  description_game text not null default '',
  icon_url text,
  rarity text not null check (rarity in ('silver', 'gold', 'prism')),
  stage text not null check (stage in ('2-1', '3-2', '4-2')),
  set_number int not null,
  patch_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists augments_stage_idx on augments (stage);

-- 스테이지별 티어 배치 (증강체 하나가 스테이지마다 다른 티어를 가질 수 있음)
create table if not exists tier_placements (
  id uuid primary key default gen_random_uuid(),
  augment_id uuid not null references augments (id) on delete cascade,
  stage text not null check (stage in ('2-1', '3-2', '4-2')),
  tier text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (augment_id, stage)
);

create index if not exists tier_placements_stage_idx on tier_placements (stage, tier);

-- 증강체별 개인 메모 (게임 기본 설명과 별개)
create table if not exists augment_notes (
  augment_id uuid primary key references augments (id) on delete cascade,
  content text not null default '',
  patch_version text,
  updated_at timestamptz not null default now()
);

-- 개인 메모에 첨부하는 이미지
create table if not exists augment_images (
  id uuid primary key default gen_random_uuid(),
  augment_id uuid not null references augments (id) on delete cascade,
  storage_path text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists augment_images_augment_idx on augment_images (augment_id);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists augments_set_updated_at on augments;
create trigger augments_set_updated_at
  before update on augments
  for each row execute function set_updated_at();

drop trigger if exists tier_placements_set_updated_at on tier_placements;
create trigger tier_placements_set_updated_at
  before update on tier_placements
  for each row execute function set_updated_at();

-- 개인용 단일 사용자 앱이므로 이 앱의 모든 DB 접근은 서버 사이드에서
-- service_role 키로만 이루어집니다 (브라우저에는 어떤 키도 노출되지 않음).
-- 혹시 모를 오남용을 막기 위해 RLS를 켜고 별도 정책은 추가하지 않습니다.
-- (service_role 키는 RLS를 우회하므로 서버 코드는 계속 정상 동작합니다.)
alter table augments enable row level security;
alter table tier_placements enable row level security;
alter table augment_notes enable row level security;
alter table augment_images enable row level security;

-- Storage: 개인 메모 이미지 업로드용 버킷
insert into storage.buckets (id, name, public)
values ('augment-images', 'augment-images', true)
on conflict (id) do nothing;
