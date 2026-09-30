-- 덱 추천 증강체/아이템에 "강력 추천" / "추천" 두 단계 구분을 추가합니다.

alter table deck_recommended_augments add column if not exists recommend_tier text not null default 'normal'
  check (recommend_tier in ('strong', 'normal'));

alter table deck_recommended_items add column if not exists recommend_tier text not null default 'normal'
  check (recommend_tier in ('strong', 'normal'));
