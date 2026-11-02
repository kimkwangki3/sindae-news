-- =====================================================================
--  해룡신문 — 유입 경로 분류 · 쪽별 유입
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  왜 필요한가
--   * 2026-11-02 최근 30일 유입이 '직접 방문' 434회, 카카오톡 0회였다.
--     지역 신문 링크가 카카오톡으로 안 돌았을 리가 없다. 카카오톡 안에서
--     열면 referrer 가 비어서 주소를 직접 친 사람과 똑같이 세어진 것이다.
--     단, 앱 내장 브라우저는 User-Agent 에 이름을 남긴다(KAKAOTALK 등).
--     referrer 가 없을 때 그 이름으로 한 번 더 가른다.
--   * ChatGPT 같은 AI 검색에서 온 사람은 호스트 이름 그대로 흩어져 있었다.
--     이제부터 볼 숫자라 처음부터 한 줄로 묶는다.
--   * "많이 본 쪽"과 "어디서 들어왔나"가 따로라, 어느 기사가 어디서 사람을
--     데려왔는지 알 수 없었다. path_sources() 가 둘을 잇는다.
--
--  ※ db/bot-detection-migration.sql 을 다시 실행하면 top_referrers 가 옛
--    분류로 돌아간다. 그때는 이 파일도 다시 실행할 것.
--  ※ User-Agent 는 90일 뒤 비워지므로(purge_old_user_agents) 그보다 오래된
--    기록의 앱 유입은 '직접 방문'으로 남는다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 유입처 판정 — 규칙은 여기 한 곳에만 둔다
-- ---------------------------------------------------------------------
-- 순서가 규칙이다. gemini.google.com 은 구글보다, 우리 주소는 다른 무엇보다
-- 먼저 본다. referrer 가 있으면 그것을 믿고, 없을 때만 User-Agent 를 본다.
create or replace function visit_source(p_referrer text, p_ua text)
returns text
language sql immutable as $$
  with h as (
    select lower(coalesce(
      regexp_replace(p_referrer, '^[a-z-]+://(www\.)?([^/?#]+).*$', '\2', 'i'),
      '')) as host
  )
  select case
    when host = '' then case
      when p_ua ~* 'kakaotalk'                  then '카카오톡'
      when p_ua ~* 'naver\(inapp|whale.*naver'  then '네이버'
      when p_ua ~* 'daumapps'                   then '다음'
      when p_ua ~* 'instagram'                  then '인스타그램'
      when p_ua ~* 'fban|fbav|fb_iab'           then '페이스북'
      else '직접 방문'
    end
    -- 우리 주소. 도메인이 늘면 여기에 더한다.
    when host like '%sdtime.net%'
      or host like '%sindae.net%'
      or host like '%sindae-news.vercel.app%'
      or host like 'localhost%'                 then '사이트 안에서 이동'
    when host like '%chatgpt.com%'
      or host like '%chat.openai.com%'          then 'ChatGPT'
    when host like '%perplexity%'               then 'Perplexity'
    when host like '%gemini.google%'            then 'Gemini'
    when host like '%claude.ai%'                then 'Claude'
    when host like '%copilot%'                  then 'Copilot'
    when host like '%wrtn%'                     then '뤼튼'
    when host like '%kakao%'                    then '카카오톡'
    when host like '%google%'                   then '구글'
    when host like '%naver%'
      or host like '%com.nhn.android%'          then '네이버'
    when host like '%daum%'                     then '다음'
    when host like '%instagram%'                then '인스타그램'
    when host like '%facebook%'                 then '페이스북'
    when host like '%youtube%'                  then '유튜브'
    when host like '%bing%'                     then '빙'
    else host
  end
  from h;
$$;

comment on function visit_source(text, text) is
  '유입처 이름. referrer 호스트로 정하고, 비어 있으면 앱 내장 브라우저 이름으로 정한다.';

-- 고정 검증. 규칙을 고쳐 어긋나면 여기서 실패해 적용되지 않는다.
do $$
begin
  assert visit_source('', 'Mozilla/5.0 (Linux; Android 14) KAKAOTALK 11.0') = '카카오톡';
  assert visit_source(null, 'Mozilla/5.0 (iPhone) NAVER(inapp; search; 2000)') = '네이버';
  assert visit_source(null, 'Mozilla/5.0 (Windows NT 10.0) Chrome/130') = '직접 방문';
  assert visit_source(null, null) = '직접 방문';
  assert visit_source('https://m.search.naver.com/search.naver?query=a', null) = '네이버';
  assert visit_source('android-app://com.nhn.android.search/', null) = '네이버';
  assert visit_source('android-app://com.kakao.talk/', null) = '카카오톡';
  assert visit_source('https://www.google.com/', null) = '구글';
  assert visit_source('https://gemini.google.com/app', null) = 'Gemini';
  assert visit_source('https://chatgpt.com/', null) = 'ChatGPT';
  assert visit_source('https://www.perplexity.ai/search', null) = 'Perplexity';
  assert visit_source('https://www.sdtime.net/article/a', 'x KAKAOTALK') = '사이트 안에서 이동';
  assert visit_source('https://example.com/a', null) = 'example.com';
end;
$$;

-- ---------------------------------------------------------------------
-- 2. 유입 경로 — 판정만 위 함수로 바꿨다
-- ---------------------------------------------------------------------
create or replace function top_referrers(p_days int default 30, p_limit int default 15)
returns table (source text, views bigint, visitors bigint, is_internal boolean)
language sql stable as $$
  with r as (
    select
      pv.session_id,
      pv.ip_hash,
      visit_source(pv.referrer, pv.user_agent) as src
    from page_views pv
    where pv.created_at >= kst_period_start(p_days)
      and not pv.is_bot
  )
  select
    src                                           as source,
    count(*)                                      as views,
    count(distinct coalesce(session_id, ip_hash)) as visitors,
    src = '사이트 안에서 이동'                     as is_internal
  from r
  group by src
  order by views desc
  limit greatest(coalesce(p_limit, 15), 1);
$$;

-- ---------------------------------------------------------------------
-- 3. 쪽별 유입 — 어느 기사가 어디서 사람을 데려왔나
-- ---------------------------------------------------------------------
create or replace function path_sources(p_days int default 30, p_limit int default 500)
returns table (path text, source text, views bigint)
language sql stable as $$
  select
    pv.path,
    visit_source(pv.referrer, pv.user_agent) as source,
    count(*)                                 as views
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
    and not pv.is_bot
    and visit_source(pv.referrer, pv.user_agent) <> '사이트 안에서 이동'
  group by 1, 2
  order by views desc
  limit greatest(coalesce(p_limit, 500), 1);
$$;

-- ---------------------------------------------------------------------
-- 권한 — 다른 집계 함수와 같다. 운영진 화면(service role)만 쓴다.
-- ---------------------------------------------------------------------
revoke all on function visit_source(text, text) from public, anon, authenticated;
revoke all on function top_referrers(int, int)  from public, anon, authenticated;
revoke all on function path_sources(int, int)   from public, anon, authenticated;

grant execute on function visit_source(text, text) to service_role;
grant execute on function top_referrers(int, int)  to service_role;
grant execute on function path_sources(int, int)   to service_role;

notify pgrst, 'reload schema';

-- 확인용
--   select * from top_referrers(30, 15);
--   select * from path_sources(1, 50);   -- 오늘
