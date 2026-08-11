-- =====================================================================
--  사이트 접속 통계 — page_views + daily_visit_stats()
--
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  schema.sql에 page_views 테이블 정의는 있었지만 아무 데서도 기록하지
--  않아 늘 비어 있었다. 여기서 테이블·인덱스를 보장하고, 관리자 대시보드가
--  쓸 일자별 집계 함수를 만든다.
--
--  방문자(UV)는 방문자 쿠키(session_id) 기준 distinct다. 쿠키를 지운
--  사람은 새 방문자로 세지만, IP 기준으로만 세면 같은 아파트·회사 공유
--  IP가 한 명으로 뭉개진다. 쿠키가 없을 때만 ip_hash로 대신 센다.
--
--  날짜 경계는 한국 시간(Asia/Seoul) 기준이다. 서버(Vercel)는 UTC로
--  도니 이걸 안 맞추면 "오늘"이 아침 9시에 바뀐다.
-- =====================================================================

create table if not exists page_views (
  id          bigint generated always as identity primary key,
  path        text not null,        -- 방문 경로 (/, /article/.., /market ..)
  ip_hash     text not null,
  session_id  text,                 -- 방문자 구분(쿠키)
  referrer    text,
  user_id     uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- 이름은 Postgres 자동 생성 규칙(<테이블>_<컬럼들>_idx)을 그대로 쓴다.
-- schema.sql이 이름 없이 만들어 둔 인덱스와 같은 이름이라, 이미 적용된
-- DB에서는 아무 일도 일어나지 않는다(중복 인덱스가 생기지 않는다).
create index if not exists page_views_created_at_idx
  on page_views (created_at);
create index if not exists page_views_path_created_at_idx
  on page_views (path, created_at);
create index if not exists page_views_session_id_created_at_idx
  on page_views (session_id, created_at);

comment on table page_views is
  '사이트 접속 로그. 일 방문자=count(distinct session_id), PV=count(*).';

-- 기록은 누구나(비로그인 방문자 포함), 읽기는 운영진만.
alter table page_views enable row level security;
drop policy if exists pview_insert on page_views;
drop policy if exists pview_read   on page_views;
create policy pview_insert on page_views for insert with check (true);
create policy pview_read   on page_views for select using (is_staff());

-- ---------------------------------------------------------------------
-- 일자별 집계 — 관리자 대시보드용
--
-- 로그 원본을 앱으로 끌어와 세지 않는 이유: PostgREST가 한 번에 주는
-- 행 수에 상한이 있어 방문이 늘면 조용히 잘린 수를 보게 된다. 집계는 DB에서.
--
-- security definer가 아니다. 호출자 권한으로 돌고, 실행 권한은
-- service_role에게만 준다(관리자 화면은 service role로 조회한다).
-- ---------------------------------------------------------------------
create or replace function daily_visit_stats(p_days int default 7)
returns table (day date, visitors bigint, views bigint)
language sql
stable
as $$
  select
    (pv.created_at at time zone 'Asia/Seoul')::date            as day,
    count(distinct coalesce(pv.session_id, pv.ip_hash))        as visitors,
    count(*)                                                   as views
  from page_views pv
  where pv.created_at >=
    (((now() at time zone 'Asia/Seoul')::date
      - (greatest(coalesce(p_days, 7), 1) - 1)) at time zone 'Asia/Seoul')
  group by 1
  order by 1;
$$;

-- Supabase는 public 스키마의 새 함수에 anon·authenticated 실행 권한을 기본으로
-- 준다. 사이트 전체 접속 수치는 운영진 것이므로 명시적으로 회수한다.
revoke all on function daily_visit_stats(int) from public, anon, authenticated;
grant execute on function daily_visit_stats(int) to service_role;

comment on function daily_visit_stats(int) is
  '최근 N일 일자별 방문자(UV)·페이지뷰(PV). 날짜 경계는 Asia/Seoul.';

notify pgrst, 'reload schema';
