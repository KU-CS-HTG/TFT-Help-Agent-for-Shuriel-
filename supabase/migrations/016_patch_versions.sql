-- 패치 버전별로 "이번 패치에 할만한 덱"을 모아두는 기능.
-- patch_versions는 사용자가 직접 추가/삭제하는 패치 버전 목록(이름 + 순서),
-- patch_deck_selections는 특정 패치 버전에 어떤 덱을 넣어뒀는지를 나타내는
-- 다대다 연결 테이블입니다(같은 덱이 여러 패치 버전에 동시에 들어갈 수 있음).

create table if not exists patch_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists patch_versions_position_idx on patch_versions (position);

create table if not exists patch_deck_selections (
  id uuid primary key default gen_random_uuid(),
  patch_version_id uuid not null references patch_versions (id) on delete cascade,
  deck_id uuid not null references decks (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (patch_version_id, deck_id)
);

create index if not exists patch_deck_selections_patch_idx on patch_deck_selections (patch_version_id);
create index if not exists patch_deck_selections_deck_idx on patch_deck_selections (deck_id);

alter table patch_versions enable row level security;
alter table patch_deck_selections enable row level security;
