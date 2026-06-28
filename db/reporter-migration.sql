-- =====================================================================
-- 신대신문 기자 기능 마이그레이션 (기자 2등급제 + 책임서약 + 승인발행)
-- Supabase SQL Editor에서 실행. ⚠️ STEP 1과 STEP 2를 "따로" 실행하세요.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1) 먼저 이것만 단독 실행 (enum 값 추가는 트랜잭션 안에서 다른 구문과 못 섞음)
-- ---------------------------------------------------------------------
alter type article_status add value if not exists 'pending';
--   기사 흐름: draft → (준기자) pending → published / (정기자·관리자) 즉시 published


-- ---------------------------------------------------------------------
-- STEP 2) STEP 1 실행 후, 아래 전체를 실행
-- ---------------------------------------------------------------------

-- 기자 등급: 기자신청자 / 준기자 / 정기자  (role='reporter'인 사람만 의미)
do $$ begin
  create type reporter_level as enum ('applicant','junior','senior');
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists reporter_level reporter_level;

-- 기사별 책임 서약 + 검수 기록
alter table articles add column if not exists pledge_ack    boolean not null default false;
alter table articles add column if not exists pledge_ack_at timestamptz;
alter table articles add column if not exists reviewed_by   uuid references profiles(id);
alter table articles add column if not exists reviewed_at   timestamptz;

comment on column profiles.reporter_level is '기자 등급: applicant(신청자·작성불가)/junior(준기자·승인후발행)/senior(정기자·즉시발행)';
comment on column articles.pledge_ack is '발행 시 작성기자 본인 책임 서약 동의';

-- 확인
-- select column_name, data_type from information_schema.columns where table_name='articles' and column_name like 'pledge%' or column_name like 'reviewed%';
-- select enum_range(null::reporter_level);  -- {applicant,junior,senior}
-- select enum_range(null::article_status);  -- {draft,published,archived,pending}
