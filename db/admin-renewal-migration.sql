-- =====================================================================
-- 관리자 리뉴얼 마이그레이션 — 감사 로그 + 정정보도
-- Supabase SQL Editor에서 실행. (재실행 안전: if not exists)
-- =====================================================================

-- 관리 행위 감사 로그 (누가/무엇을/언제)
create table if not exists admin_audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),       -- 수행 관리자
  action      text not null,                      -- approve_article / hide_comment / ...
  target_type text,                               -- article/comment/business/...
  target_id   text,                               -- slug 또는 uuid 등 식별자(유연하게 text)
  memo        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on admin_audit_logs (created_at desc);
create index if not exists idx_audit_actor   on admin_audit_logs (actor_id);

-- 정정보도 (언론 법적 의무)
create table if not exists corrections (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references articles(id) on delete set null,
  reason      text,
  body        text,                               -- 정정 내용
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index if not exists idx_corrections_created on corrections (created_at desc);

-- RLS: 둘 다 staff(관리자)만 조회. 쓰기는 service_role(관리자 액션)이 RLS 우회.
alter table admin_audit_logs enable row level security;
drop policy if exists audit_read on admin_audit_logs;
create policy audit_read on admin_audit_logs for select using (is_staff());

alter table corrections enable row level security;
drop policy if exists correction_read   on corrections;
drop policy if exists correction_insert on corrections;
create policy correction_read on corrections for select using (is_staff());
-- 정정 요청은 누구나 접수 가능(독자 정정청구) — 조회는 staff만
create policy correction_insert on corrections for insert with check (true);
