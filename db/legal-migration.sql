-- =====================================================================
-- 법적 페이지 DB 편집형 — legal_pages
-- Supabase SQL Editor에서 실행. (재실행 안전)
-- =====================================================================
create table if not exists legal_pages (
  slug        text primary key,
  title       text not null,
  body        text,                       -- 관리자가 편집(빈 줄로 문단 구분)
  updated_at  timestamptz not null default now()
);

-- 공개 읽기(법적 고지는 누구나) / 쓰기는 service_role(관리자)만
alter table legal_pages enable row level security;
drop policy if exists legal_read on legal_pages;
create policy legal_read on legal_pages for select using (true);

-- 5개 페이지 슬롯 시드(제목만; 본문은 관리자가 /admin/legal 에서 입력)
insert into legal_pages (slug, title) values
  ('publisher','발행인·편집인'),
  ('youth','청소년보호정책'),
  ('ethics','윤리강령'),
  ('correction','정정보도 청구 안내'),
  ('privacy','개인정보처리방침')
on conflict (slug) do nothing;
