-- =====================================================================
--  해룡신문 — 해룡상권 리뷰·별점
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  화면에 ★0 · 리뷰 0 이 고정으로 찍히던 것을 실제 데이터로 바꾼다.
--  한 사람이 한 업체에 리뷰 하나(unique) — 수정은 가능, 중복 작성은 불가.
-- =====================================================================

create table if not exists business_reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  visibility  visibility not null default 'visible',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (business_id, author_id)
);

create index if not exists business_reviews_biz_idx
  on business_reviews (business_id, created_at desc);

comment on table  business_reviews        is '업체 리뷰·별점. 1인 1업체 1건';
comment on column business_reviews.rating is '별점 1~5';

-- ---------------------------------------------------------------------
-- RLS — 공개 읽기(숨김 제외), 로그인 회원 본인 작성/수정/삭제, 운영진 전체 관리
-- ---------------------------------------------------------------------
alter table business_reviews enable row level security;

drop policy if exists breview_read   on business_reviews;
drop policy if exists breview_insert on business_reviews;
drop policy if exists breview_update on business_reviews;
drop policy if exists breview_delete on business_reviews;

create policy breview_read on business_reviews
  for select using (visibility = 'visible' or is_staff());

create policy breview_insert on business_reviews
  for insert with check (author_id = auth.uid());

create policy breview_update on business_reviews
  for update using (author_id = auth.uid() or is_staff());

create policy breview_delete on business_reviews
  for delete using (author_id = auth.uid() or is_staff());

notify pgrst, 'reload schema';
