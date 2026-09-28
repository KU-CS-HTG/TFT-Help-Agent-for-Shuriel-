-- "플레이할 만한 덱 종류" 목록. 스테이지 구분 없이 전체 공용 목록이며, 각
-- 덱은 대표 이미지 1장 + 서브 이미지 여러 장 + 플레이 팁 텍스트를 가집니다.
-- 이미지는 기존 augment-images 버킷을 그대로 쓰되 decks/ 경로 밑에 저장합니다.

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  main_image_url text,
  main_image_storage_path text,
  tips text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decks_position_idx on decks (position);

drop trigger if exists decks_set_updated_at on decks;
create trigger decks_set_updated_at
  before update on decks
  for each row execute function set_updated_at();

create table if not exists deck_sub_images (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks (id) on delete cascade,
  storage_path text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists deck_sub_images_deck_idx on deck_sub_images (deck_id);

alter table decks enable row level security;
alter table deck_sub_images enable row level security;
