-- 아이템 티어리스트. 일반(조합)/유물/찬란 3개 카테고리로 나뉘고, 카테고리별로
-- 독립적인 S/A/B/C 티어 배치를 가집니다. 아이템 원본 데이터(이름/아이콘/능력치
-- 설명)는 증강체와 마찬가지로 Community Dragon에서 가져와 캐싱합니다.

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  api_name text not null unique,
  name text not null,
  icon_url text,
  official_desc text not null default '',
  category text not null check (category in ('normal', 'artifact', 'radiant')),
  set_number int not null,
  patch_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_category_idx on items (category);

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

-- 아이템은 카테고리 하나에만 속하므로(증강체처럼 스테이지 간 중복 배치가 없음)
-- 아이템당 티어 배치가 최대 하나입니다.
create table if not exists item_tier_placements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references items (id) on delete cascade,
  tier text not null check (tier in ('S', 'A', 'B', 'C')),
  position int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists item_tier_placements_tier_idx on item_tier_placements (tier);

drop trigger if exists item_tier_placements_set_updated_at on item_tier_placements;
create trigger item_tier_placements_set_updated_at
  before update on item_tier_placements
  for each row execute function set_updated_at();

-- 아이템별 개인 메모 (게임 원본 능력치 설명과 별개)
create table if not exists item_notes (
  item_id uuid primary key references items (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists item_notes_set_updated_at on item_notes;
create trigger item_notes_set_updated_at
  before update on item_notes
  for each row execute function set_updated_at();

alter table items enable row level security;
alter table item_tier_placements enable row level security;
alter table item_notes enable row level security;
