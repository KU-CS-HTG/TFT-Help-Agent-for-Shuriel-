-- 덱마다 추천 증강체/아이템을 드래그로 정리할 수 있는 다대다 연결 테이블.

create table if not exists deck_recommended_augments (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks (id) on delete cascade,
  augment_id uuid not null references augments (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (deck_id, augment_id)
);

create index if not exists deck_recommended_augments_deck_idx on deck_recommended_augments (deck_id);

create table if not exists deck_recommended_items (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (deck_id, item_id)
);

create index if not exists deck_recommended_items_deck_idx on deck_recommended_items (deck_id);

alter table deck_recommended_augments enable row level security;
alter table deck_recommended_items enable row level security;
