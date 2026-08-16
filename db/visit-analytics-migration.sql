-- =====================================================================
--  해룡신문 — 접속 분석 집계 함수
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  왜 필요한가
--   * 대시보드에 일주일치 막대만 있었다. "이번 달에 몇 명이 왔나",
--     "어느 기사가 사람을 데려왔나", "다들 어디서 들어오나"를 볼 곳이 없다.
--     지역 신문에서 이건 호기심이 아니라 다음 달 취재 목록을 정하는 근거다.
--
--  왜 전부 DB에서 세는가
--   * page_views 는 방문 한 번에 한 줄씩 쌓이는 원본 로그다. 앱으로 끌어와
--     세면 PostgREST 의 행 상한에 걸려, 방문이 늘수록 조용히 '적은 수'를
--     보게 된다. 틀린 줄도 모르고 보는 숫자가 제일 나쁘다.
--
--  날짜 경계는 전부 한국시간(Asia/Seoul)이다. 서버는 UTC로 도니 이걸
--  안 맞추면 '오늘'이 아침 9시에 바뀐다.
--
--  권한: 사이트 전체 접속 수치는 운영진 것이다. anon·authenticated 에서
--  회수하고 service_role 에만 준다(관리자 화면은 service role 로 조회한다).
-- =====================================================================

-- 기간 시작 시각(한국시간 기준 N일 전 00:00) — 아래 함수들이 공통으로 쓴다.
create or replace function kst_period_start(p_days int)
returns timestamptz
language sql stable as $$
  select (((now() at time zone 'Asia/Seoul')::date
           - (greatest(coalesce(p_days, 7), 1) - 1)) at time zone 'Asia/Seoul');
$$;

-- ---------------------------------------------------------------------
-- 1. 기간 요약
-- ---------------------------------------------------------------------
-- 일자별 방문자를 더하면 안 된다. 사흘 연속 들른 한 사람이 3명이 된다.
-- 기간 전체를 한 번에 세야 '몇 명이 왔는가'가 나온다.
create or replace function visit_summary(p_days int default 30)
returns table (visitors bigint, views bigint, days_with_traffic bigint)
language sql stable as $$
  select
    count(distinct coalesce(session_id, ip_hash))                  as visitors,
    count(*)                                                        as views,
    count(distinct (created_at at time zone 'Asia/Seoul')::date)   as days_with_traffic
  from page_views
  where created_at >= kst_period_start(p_days);
$$;

-- ---------------------------------------------------------------------
-- 2. 많이 본 경로
-- ---------------------------------------------------------------------
create or replace function top_paths(p_days int default 30, p_limit int default 30)
returns table (path text, views bigint, visitors bigint)
language sql stable as $$
  select
    pv.path,
    count(*)                                                as views,
    count(distinct coalesce(pv.session_id, pv.ip_hash))     as visitors
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
  group by pv.path
  order by views desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

-- ---------------------------------------------------------------------
-- 3. 유입 경로
-- ---------------------------------------------------------------------
-- 주소 전체를 그대로 묶으면 같은 검색엔진이 검색어마다 다른 줄로 흩어진다.
-- 호스트만 남겨 묶는다. referrer 가 비면 '직접 방문'(주소 입력·앱·북마크)이다.
--
-- ★ 우리 도메인은 유입이 아니다. 사이트 안에서 링크를 타고 넘어가도 referrer
--   에 우리 주소가 남는다. 처음 만들었을 때 이걸 빼지 않아 "sdtime.net 448회"
--   가 1위로 떴다 — 정작 궁금한 카카오톡·구글·네이버가 그 아래 묻혔다.
--   빼지 않고 'internal' 로 표시만 해서 내보낸다. 화면에서 따로 다룬다.
--
-- 검색엔진과 메신저는 호스트가 여러 개다(m.search.naver.com, search.naver.com…).
-- 사람이 읽을 이름으로 묶어야 "네이버에서 몇 명"이 한 줄로 보인다.
drop function if exists top_referrers(int, int);
create or replace function top_referrers(p_days int default 30, p_limit int default 15)
returns table (source text, views bigint, visitors bigint, is_internal boolean)
language sql stable as $$
  with r as (
    select
      pv.session_id,
      pv.ip_hash,
      case
        when pv.referrer is null or pv.referrer = '' then ''
        else lower(coalesce(
          nullif(regexp_replace(pv.referrer, '^https?://(www\.)?([^/?#]+).*$', '\2'), ''),
          ''))
      end as host
    from page_views pv
    where pv.created_at >= kst_period_start(p_days)
  )
  select
    case
      when host = '' then '직접 방문'
      -- 우리 주소. 도메인이 늘면 여기에 더한다.
      when host like '%sdtime.net%'
        or host like '%sindae.net%'
        or host like '%sindae-news.vercel.app%'
        or host like 'localhost%' then '사이트 안에서 이동'
      when host like '%kakao%' then '카카오톡'
      when host like '%google%' then '구글'
      when host like '%naver%' then '네이버'
      when host like '%daum%' then '다음'
      when host like '%instagram%' then '인스타그램'
      when host like '%facebook%' then '페이스북'
      when host like '%youtube%' then '유튜브'
      when host like '%bing%' then '빙'
      else host
    end as source,
    count(*)                                            as views,
    count(distinct coalesce(session_id, ip_hash))       as visitors,
    bool_or(
      host like '%sdtime.net%'
      or host like '%sindae.net%'
      or host like '%sindae-news.vercel.app%'
      or host like 'localhost%'
    )                                                   as is_internal
  from r
  group by 1
  order by views desc
  limit greatest(coalesce(p_limit, 15), 1);
$$;

-- ---------------------------------------------------------------------
-- 4. 기사별 조회
-- ---------------------------------------------------------------------
-- articles.view_count 는 창간 이래 누적이라 "이번 달에 뭐가 읽혔나"를 알 수
-- 없다. article_views 원본을 기간으로 잘라 센다.
--
-- 체류시간과 읽음률도 함께 낸다. 조회수만 보면 제목만 보고 닫은 기사와
-- 끝까지 읽힌 기사가 같아 보인다. 지역 신문에는 그 차이가 더 중요하다.
create or replace function article_view_stats(p_days int default 30, p_limit int default 50)
returns table (
  article_id uuid,
  views bigint,
  visitors bigint,
  avg_dwell_sec numeric,
  avg_scroll numeric
)
language sql stable as $$
  select
    av.article_id,
    count(*)                                              as views,
    count(distinct coalesce(av.user_id::text, av.ip_hash)) as visitors,
    round(avg(av.dwell_ms) / 1000.0, 1)                   as avg_dwell_sec,
    round(avg(av.scroll_pct), 0)                          as avg_scroll
  from article_views av
  where av.created_at >= kst_period_start(p_days)
    and av.article_id is not null
  group by av.article_id
  order by views desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

-- ---------------------------------------------------------------------
-- 5. 시간대별 — 언제 기사를 내보내면 좋은가
-- ---------------------------------------------------------------------
create or replace function hourly_visit_stats(p_days int default 30)
returns table (hour int, views bigint, visitors bigint)
language sql stable as $$
  select
    extract(hour from (pv.created_at at time zone 'Asia/Seoul'))::int as hour,
    count(*)                                                as views,
    count(distinct coalesce(pv.session_id, pv.ip_hash))     as visitors
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------
-- 권한
-- ---------------------------------------------------------------------
revoke all on function kst_period_start(int)        from public, anon, authenticated;
revoke all on function visit_summary(int)           from public, anon, authenticated;
revoke all on function top_paths(int, int)          from public, anon, authenticated;
revoke all on function top_referrers(int, int)      from public, anon, authenticated;
revoke all on function article_view_stats(int, int) from public, anon, authenticated;
revoke all on function hourly_visit_stats(int)      from public, anon, authenticated;

grant execute on function kst_period_start(int)        to service_role;
grant execute on function visit_summary(int)           to service_role;
grant execute on function top_paths(int, int)          to service_role;
grant execute on function top_referrers(int, int)      to service_role;
grant execute on function article_view_stats(int, int) to service_role;
grant execute on function hourly_visit_stats(int)      to service_role;

-- 기간을 넓게 잡고 조회하므로 인덱스를 확인해 둔다.
create index if not exists article_views_created_at_idx
  on article_views (created_at);
create index if not exists article_views_article_created_idx
  on article_views (article_id, created_at);

notify pgrst, 'reload schema';
