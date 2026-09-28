-- 스테이지(2-1/3-2/4-2)마다 "이번엔 이런 방향으로 증강체를 고르자" 같은
-- 전체 전략 메모를 하나씩 둘 수 있게 합니다. 개별 증강체 메모(augment_notes)
-- 와는 별개입니다.

create table if not exists stage_notes (
  stage text primary key check (stage in ('2-1', '3-2', '4-2')),
  content text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists stage_notes_set_updated_at on stage_notes;
create trigger stage_notes_set_updated_at
  before update on stage_notes
  for each row execute function set_updated_at();

alter table stage_notes enable row level security;
