-- =====================================================================
--  신대신문 (DSBH) — Database Schema  [PostgreSQL / Supabase]
--  작성: 2026-06  ·  설계 기준: design-mockup.html 의 전체 화면
--  실행 순서: 이 파일을 Supabase SQL Editor 에 그대로 붙여넣어 실행
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 0. ENUM 타입
-- ---------------------------------------------------------------------
create type user_role       as enum ('user','reporter','admin','superadmin');
create type article_status  as enum ('draft','published','archived');
create type review_status   as enum ('pending','approved','rejected');   -- 승인형(업체/단체/기자/광고/홍보글)
create type visibility      as enum ('visible','hidden');                -- 노출/숨김(댓글 등)
create type reaction_type   as enum ('like','dislike');
create type market_category as enum ('share','request','done');          -- 나눔/요청/완료
create type org_role        as enum ('owner','staff','member');
create type join_status     as enum ('pending','approved','rejected');
create type report_target   as enum ('article','comment','business','organization','market_post','org_post','promo_post','board_post','board_comment');
create type report_status   as enum ('pending','resolved','ignored');

-- ---------------------------------------------------------------------
-- 1. 회원 (auth.users 와 1:1) · 등급
-- ---------------------------------------------------------------------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  kakao_id        text unique,
  nickname        text not null unique,         -- 자체 닉네임(중복 불가)
  nickname_set_at timestamptz,                  -- 최초/최근 설정 시각
  neighborhood    text,                         -- 거주 동네
  phone           text,
  avatar_url      text,
  role            user_role not null default 'user',   -- ① 계정 등급
  is_suspended    boolean not null default false,      -- ③ 정지(차단)
  suspend_reason  text,
  suspend_until   timestamptz,
  deleted_at      timestamptz,                          -- 탈퇴
  created_at      timestamptz not null default now()
);
comment on table profiles is '회원. nickname 중복불가. role=user/reporter/admin/superadmin. 업체·단체 권한은 멤버 테이블로 부여';

-- 닉네임 변경 이력 (부적절 닉네임 추적·복구)
create table nickname_history (
  id           bigint generated always as identity primary key,
  user_id      uuid references profiles(id) on delete cascade,
  old_nickname text,
  new_nickname text,
  changed_by   uuid references profiles(id),   -- 본인 or 관리자
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. 기사 시스템
-- ---------------------------------------------------------------------
create table categories (
  id    smallint generated always as identity primary key,
  slug  text unique not null,               -- local / admin / people / life
  name  text not null,                      -- 지역소식 / 행정 / 인물 / 생활
  sort  smallint not null default 0
);

create table articles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique not null,
  category_id   smallint references categories(id),
  thumbnail_url text,
  body          text,                        -- 마크다운/HTML
  author_id     uuid references profiles(id),
  status        article_status not null default 'draft',
  view_count    integer not null default 0,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on articles (status, published_at desc);
create index on articles (category_id, published_at desc);

-- 핫소식(일/주/월 베스트) + 기사별 읽음 분석용 로그
create table article_views (
  id          bigint generated always as identity primary key,
  article_id  uuid references articles(id) on delete cascade,
  ip_hash     text not null,
  user_id     uuid references profiles(id),
  referrer    text,                 -- 유입 경로 (카카오/검색/직접)
  dwell_ms    integer,              -- 체류시간(ms)
  scroll_pct  smallint,             -- 읽음률: 스크롤 도달 % (0~100)
  created_at  timestamptz not null default now()
);
create index on article_views (created_at);
create index on article_views (article_id, created_at);
-- 기사별 집계 예: 조회수=count, 순방문=count(distinct ip_hash),
--   평균읽음률=avg(scroll_pct), 평균체류=avg(dwell_ms)

-- 사이트 전체 접속 통계 (방문자/PV)
create table page_views (
  id          bigint generated always as identity primary key,
  path        text not null,        -- 방문 경로 (/, /article/.., /market ..)
  ip_hash     text not null,
  session_id  text,                 -- 방문자 구분(쿠키)
  referrer    text,
  user_id     uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index on page_views (created_at);
create index on page_views (path, created_at);
-- 일 방문자=count(distinct session_id by day), PV=count(*)

-- 좋아요/싫어요 : IP당 1회 (중복 불가) — 핵심 제약
create table article_reactions (
  id          bigint generated always as identity primary key,
  article_id  uuid references articles(id) on delete cascade,
  user_id     uuid references profiles(id),      -- 로그인 시 기록(선택)
  ip_hash     text not null,
  type        reaction_type not null,
  created_at  timestamptz not null default now(),
  unique (article_id, ip_hash)                    -- ← IP별 1회만, like/dislike 변경은 update
);

-- 댓글 (로그인 필요)
create table comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references articles(id) on delete cascade,
  author_id   uuid references profiles(id) on delete set null,
  body        text not null,
  visibility  visibility not null default 'visible',
  created_at  timestamptz not null default now()
);
create index on comments (article_id, created_at);

-- ---------------------------------------------------------------------
-- 3. 제보 / 기자 모집
-- ---------------------------------------------------------------------
create table tips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text,
  body        text,
  photo_urls  text[],
  contact     text,
  reporter_id uuid references profiles(id),   -- 비로그인 제보 허용 → nullable
  status      review_status not null default 'pending',  -- 신규/확인/기사화 처리
  created_at  timestamptz not null default now()
);

create table reporter_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id),
  name          text not null,
  phone         text,
  email         text,
  neighborhood  text,
  interests     text[],
  motivation    text,
  -- ⚖ 책임 서약 (법적 증빙) : 기사 책임은 기자 본인에게 있음
  pledge_agreed boolean not null default false,
  signed_name   text not null,
  agreed_at     timestamptz,
  agreed_ip     text,
  status        review_status not null default 'pending',
  reviewed_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
comment on column reporter_applications.pledge_agreed is '기사 법적·윤리 책임은 작성 기자 본인 부담 서약 동의';

-- ---------------------------------------------------------------------
-- 4. 나눔마켓
-- ---------------------------------------------------------------------
create table market_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references profiles(id) on delete cascade,
  category     market_category not null,
  title        text not null,
  neighborhood text,
  body         text,
  is_pinned    boolean not null default false,   -- 상단고정(관리자)
  visibility   visibility not null default 'visible',
  created_at   timestamptz not null default now()
);
create index on market_posts (category, created_at desc);

create table market_photos (
  id        bigint generated always as identity primary key,
  post_id   uuid references market_posts(id) on delete cascade,
  url       text not null,
  sort      smallint default 0
);
create table market_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references market_posts(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null,
  visibility visibility not null default 'visible',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4-2. 자유게시판
-- ---------------------------------------------------------------------
create table board_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references profiles(id) on delete set null,
  category   text not null,                  -- 일상/질문/동네소식
  title      text not null,
  body       text,
  like_count integer not null default 0,
  view_count integer not null default 0,
  is_pinned  boolean not null default false, -- 공지 고정(관리자)
  visibility visibility not null default 'visible',
  created_at timestamptz not null default now()
);
create index on board_posts (category, created_at desc);
create index on board_posts (is_pinned desc, created_at desc);

create table board_photos (
  id       bigint generated always as identity primary key,
  post_id  uuid references board_posts(id) on delete cascade,
  url text not null, sort smallint default 0
);
create table board_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references board_posts(id) on delete cascade,
  author_id  uuid references profiles(id) on delete set null,
  body       text not null,
  visibility visibility not null default 'visible',
  created_at timestamptz not null default now()
);
-- 게시글 좋아요: 로그인 1인 1회
create table board_likes (
  id       bigint generated always as identity primary key,
  post_id  uuid references board_posts(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  unique (post_id, user_id)
);

-- ---------------------------------------------------------------------
-- 5. 신대상권 (업체)
-- ---------------------------------------------------------------------
create table businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references profiles(id) on delete set null,
  name            text not null,
  category        text not null,             -- 맛집/카페/생활편의/의료...
  address         text,
  phone           text,
  biz_reg_no      text,                       -- 사업자등록번호(비공개 확인용)
  kakao_channel   text,                       -- 카카오톡 채널 URL (1:1 문의)
  logo_url        text,
  intro           text,
  hours_open      time,
  hours_close     time,
  is_24h          boolean default false,
  closed_days     text[],                     -- ['일'] / ['연중무휴']
  status          review_status not null default 'pending',  -- 관리자 승인
  reviewed_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);
-- ★ 업체는 1인 1개만: 거절(rejected) 외 상태에서 owner당 1행만 허용
create unique index uniq_business_per_owner
  on businesses (owner_id)
  where status in ('pending','approved');

-- 업체 멤버십(점주/직원). 현재는 owner 1행이 기본.
create table business_members (
  id          bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        org_role not null default 'owner',
  unique (business_id, user_id)
);
create table business_photos (
  id          bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade,
  url text not null, sort smallint default 0
);
create table business_menus (
  id          bigint generated always as identity primary key,
  business_id uuid references businesses(id) on delete cascade,
  name text not null, price integer, photo_url text, sort smallint default 0
);

-- 상권 홍보 글 (등록 업체만, 게시 승인 필요)
create table promo_posts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  author_id   uuid references profiles(id),
  title       text not null,
  category    text,                           -- 이벤트/신메뉴/공지
  body        text,
  photo_urls  text[],
  status      review_status not null default 'pending',
  visibility  visibility not null default 'visible',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. 지역단체
-- ---------------------------------------------------------------------
create table organizations (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references profiles(id) on delete set null,
  name          text not null,
  category      text not null,                -- 주민자치/봉사/동호회/종교문화
  leader        text,                          -- 대표/직책
  region        text,
  contact       text,
  kakao_channel text,
  accept_join   boolean not null default true, -- 가입 신청 받기
  logo_url      text,
  intro         text,
  status        review_status not null default 'pending',  -- 관리자 승인
  reviewed_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create table org_photos (
  id      bigint generated always as identity primary key,
  org_id  uuid references organizations(id) on delete cascade,
  url text not null, sort smallint default 0
);

-- 단체 회원/가입신청 (운영진이 승인)
create table org_members (
  id           bigint generated always as identity primary key,
  org_id       uuid references organizations(id) on delete cascade,
  user_id      uuid references profiles(id) on delete cascade,
  role         org_role not null default 'member',
  status       join_status not null default 'pending',  -- 가입 신청 → 운영진 승인
  apply_name   text,
  apply_phone  text,
  neighborhood text,
  motivation   text,
  created_at   timestamptz not null default now(),
  unique (org_id, user_id)
);

-- 단체 소식 글 (운영진 작성)
create table org_posts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete cascade,
  author_id  uuid references profiles(id),
  title      text not null,
  category   text,                            -- 모집/공지/활동후기
  body       text,
  photo_urls text[],
  visibility visibility not null default 'visible',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. 광고
-- ---------------------------------------------------------------------
create table ad_slots (
  id         smallint generated always as identity primary key,
  key        text unique not null,            -- home_top / home_mid / article_top ...
  label      text not null,                   -- 홈 상단 배너 ...
  size       text,                            -- 1200x300
  is_active  boolean not null default true
);

-- 현재 게재중 배너
create table ads (
  id          uuid primary key default gen_random_uuid(),
  slot_id     smallint references ad_slots(id),
  advertiser  text,
  image_url   text,
  link_url    text,
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 광고 신청 (승인 후 ads 로 게재)
create table ad_requests (
  id          uuid primary key default gen_random_uuid(),
  advertiser  text not null,
  slot_id     smallint references ad_slots(id),
  image_url   text,
  link_url    text,
  duration    text,                            -- 1주/1개월/3개월
  contact     text,
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. 신고 (전 콘텐츠 통합)
-- ---------------------------------------------------------------------
create table reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  report_target not null,
  target_id    uuid not null,                  -- 대상 글/댓글/업체/단체 id
  reason       text not null,                  -- 욕설/허위/스팸/음란/개인정보/저작권/기타
  detail       text,
  reporter_id  uuid references profiles(id),    -- 비로그인 신고 허용 → nullable
  reporter_ip  text,
  status       report_status not null default 'pending',
  handled_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index on reports (status, created_at desc);
create index on reports (target_type, target_id);

-- 찜/관심 (가게·나눔·단체)
create table favorites (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id) on delete cascade,
  target_type report_target,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

-- ---------------------------------------------------------------------
-- 9. updated_at 자동 갱신 트리거 (articles)
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger trg_articles_updated
  before update on articles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 10. 권한 헬퍼 + RLS (행 단위 보안) — 핵심 정책 예시
-- ---------------------------------------------------------------------
create or replace function is_staff() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','superadmin')
  );
$$ language sql stable security definer;

-- 기사: 누구나 발행글 읽기 / 작성·수정은 기자 본인 or 관리자
alter table articles enable row level security;
create policy article_read on articles
  for select using (status = 'published' or author_id = auth.uid() or is_staff());
create policy article_write on articles
  for insert with check (author_id = auth.uid() or is_staff());
create policy article_update on articles
  for update using (author_id = auth.uid() or is_staff());

-- 댓글: 노출글 읽기 / 작성은 로그인 / 수정·삭제는 본인 or 관리자
alter table comments enable row level security;
create policy comment_read on comments
  for select using (visibility = 'visible' or author_id = auth.uid() or is_staff());
create policy comment_insert on comments
  for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy comment_modify on comments
  for update using (author_id = auth.uid() or is_staff());

-- 나눔마켓 글: 본인 작성/수정, 관리자 전체 관리
alter table market_posts enable row level security;
create policy market_read on market_posts
  for select using (visibility = 'visible' or author_id = auth.uid() or is_staff());
create policy market_write on market_posts
  for insert with check (auth.uid() = author_id);
create policy market_modify on market_posts
  for update using (author_id = auth.uid() or is_staff());

-- 신고: 누구나 생성 / 조회·처리는 관리자만
alter table reports enable row level security;
create policy report_insert on reports for insert with check (true);
create policy report_admin  on reports for select using (is_staff());

-- (업체·단체·광고·기자신청 등 나머지 테이블도 동일 패턴으로 정책 추가)

-- ---------------------------------------------------------------------
-- 11. 초기 데이터
-- ---------------------------------------------------------------------
insert into categories (slug, name, sort) values
  ('local','지역소식',1), ('admin','행정',2), ('people','인물',3), ('life','생활',4);

insert into ad_slots (key, label, size) values
  ('home_top','홈 상단 배너','1200x300'),
  ('home_mid','홈 중간 배너','1200x300'),
  ('home_bottom','홈 하단 배너','1200x300'),
  ('article_top','기사 상단 배너','1200x300'),
  ('article_mid','기사 중간 배너','1200x300'),
  ('article_bottom','기사 하단 배너','1200x300'),
  ('district_top','상권 상단 배너','1200x300'),
  ('market_infeed','나눔마켓 인피드','1200x300'),
  ('side','사이드 배너(PC)','300x600');
