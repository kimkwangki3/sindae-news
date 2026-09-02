-- =====================================================================
--  해룡신문 — 크롤러 판별 · 집계에서 제외 · 텔레그램 알림
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  ※ 맨 끝 9)의 자동 실행 등록에만 pg_cron 이 필요하다. 설문 IP 정리
--    (survey-ip-cleanup-migration.sql)를 이미 적용했다면 켜져 있다.
--    없어도 9)만 실패하고 나머지는 그대로 적용된다.
--
--  ── 왜 필요한가 ────────────────────────────────────────────────────
--
--  2026-09-02 새벽, 방문자가 59명으로 찍혔다. 평소는 8~17명이다.
--  원본을 뜯어보니 사람이 아니었다.
--
--    · 02:49~03:19, 31~32초 간격으로 정확히 한 쪽씩
--    · 기사 → 그 기사에 달린 태그 → 다음 기사 순으로 35개 태그를 전부
--    · 59명 중 56명이 딱 한 쪽만 보고 떠남 (1인당 1.07쪽)
--    · IP 58개가 전부 다름. 쿠키도 매번 새것
--
--  사이트맵에 /tag/… 는 없다. 그런데 태그를 다 찾아갔다 — 화면을 실제로
--  그려서 링크를 눌러가며 돌아다녔다는 뜻이다. 자바스크립트를 돌리는
--  헤드리스 브라우저다.
--
--  ── 왜 User-Agent 정규식만으로는 안 되는가 ────────────────────────
--
--  lib/visit-actions.ts 와 middleware.ts 에 봇 정규식이 이미 있다. 그런데
--  이 크롤러는 걸리지 않았다. 이름에 bot·crawl 이 들어가야 걸리는데,
--  차단당하기 싫은 수집기는 일반 크롬인 척한다. 게다가 매 요청마다 IP를
--  바꾸므로 IP로도 못 막는다.
--
--  그래서 이름이 아니라 '움직인 모양'으로 판별한다. 아래 2)가 그것이다.
--  이름 정규식(is_bot_ua)은 값싸게 먼저 거르는 1차 그물로만 쓴다.
--
--  ── 왜 표시해 두는가(그때그때 세지 않고) ──────────────────────────
--
--  움직인 모양 판별은 "이 방문 앞뒤 5분에 누가 또 있었나"를 봐야 해서
--  조회할 때마다 계산하면 기간이 넓어질수록 느려진다. 매시간 한 번
--  최근 24시간을 다시 판정해 page_views.is_bot 에 적어 둔다. 집계
--  함수들은 그 칸만 보면 된다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. 기록 칸 — 무엇으로 왔는지, 봇인지
-- ---------------------------------------------------------------------

-- 브라우저가 스스로 밝힌 이름. 이번에 이걸 안 남기고 있어서 "어떤
-- 프로그램이었나"를 되짚을 수 없었다. 원문 그대로는 두지 않는다 —
-- 300자로 자르고(lib/visit-actions.ts), 90일 뒤 비운다(아래 4).
alter table page_views add column if not exists user_agent text;

-- 판정 결과. 기본값은 false — 판정하기 전에는 사람으로 본다.
-- 잘못 걸러 사람을 지우는 것보다, 못 걸러 봇이 섞이는 편이 덜 나쁘다.
alter table page_views add column if not exists is_bot boolean not null default false;

-- 집계 함수가 전부 "봇 아닌 것만"으로 도니 이 조건이 인덱스에 들어가야 한다.
create index if not exists page_views_human_created_at_idx
  on page_views (created_at) where not is_bot;

comment on column page_views.user_agent is
  '브라우저가 밝힌 이름(300자). 90일 뒤 purge_old_user_agents()가 비운다.';
comment on column page_views.is_bot is
  '크롤러 판정. mark_bot_visits()가 매시간 다시 적는다. 집계는 이게 false인 것만 센다.';


-- ---------------------------------------------------------------------
-- 1. 이름으로 거르기 — 1차 그물
-- ---------------------------------------------------------------------
-- lib/visit-actions.ts 의 BOT 정규식과 짝이다. 한쪽만 고치면 앱이 안 남긴
-- 것을 DB가 다시 세는 어긋남이 생긴다. 고칠 때는 양쪽을 같이 고칠 것.
--
-- 여기에는 앱 쪽에 없는 이름도 넣는다. 앱은 '기록할까 말까'를 정하지만
-- 여기는 '이미 쌓인 것을 어떻게 셀까'를 정하므로, 넓게 잡아도 잃는 것이 없다.
create or replace function is_bot_ua(p_ua text)
returns boolean
language sql immutable as $$
  select p_ua is not null and p_ua ~* (
    'bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor'
    '|pingdom|lighthouse|headless|curl|wget|python-requests|axios|okhttp'
    '|scrapy|httpclient|java/|go-http|node-fetch|libwww|apache-http'
    '|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot'
    '|ccbot|perplexity|amazonbot|applebot|dataforseo|serpstat|blexbot'
  );
$$;

comment on function is_bot_ua(text) is
  '이름만 보고 아는 봇. lib/visit-actions.ts 의 BOT 정규식과 짝이다.';


-- ---------------------------------------------------------------------
-- 2. 움직인 모양으로 거르기 — 이번 건을 잡는 그물
-- ---------------------------------------------------------------------
--
-- 판별 규칙 (한 문장)
--   한 쪽만 보고 떠난 방문자인데, 그 앞뒤 5분 안에 '서로 다른 주소를
--   한 번씩만 열고 떠난 방문자'가 5명 이상 있으면 크롤러로 본다.
--
-- 왜 '서로 다른 주소'가 조건에 들어가는가 — 이 줄이 제일 중요하다.
--
--   기사 하나가 동네 단톡방에 돌면, 5분 안에 열 명이 각자 한 쪽만 보고
--   나간다. 크롤러와 모양이 똑같다. 게다가 카카오톡에서 열면 유입 경로가
--   빈 값으로 오는 일이 흔해서(components/VisitTracker.tsx 주석) 그것으로도
--   못 가른다. 지역 신문에서 이걸 봇으로 지우면 제일 중요한 순간을 지우는
--   셈이다.
--
--   가르는 것은 '무엇을 보았나'다. 단톡방에서 온 사람들은 같은 기사 하나를
--   본다. 크롤러는 서로 다른 주소를 훑는다. 2026-09-02 새벽에는 5분마다
--   열 개 안팎의 서로 다른 태그·기사가 나왔다.
--
-- 5분·5명은 넉넉하게 잡은 값이다. 평소 하루 방문자가 10~15명이라
-- 5분 안에 서로 다른 주소를 하나씩만 여는 사람이 다섯 넘게 겹칠 일은 없다.
create or replace function bot_visitors(
  p_from timestamptz,
  p_to   timestamptz default now()
)
returns table (
  vid        text,
  first_at   timestamptz,
  last_at    timestamptz,
  ip_hash    text,
  user_agent text,
  sample_path text,
  reason     text,
  neighbors  int
)
language sql stable as $$
  with v as (
    select
      coalesce(pv.session_id, pv.ip_hash)                    as vid,
      min(pv.created_at)                                     as first_at,
      max(pv.created_at)                                     as last_at,
      count(*)                                               as views,
      count(*) filter (where coalesce(pv.referrer, '') <> '') as ext_views,
      min(pv.ip_hash)                                        as ip_hash,
      (array_agg(pv.user_agent order by pv.created_at))[1]   as user_agent,
      (array_agg(pv.path       order by pv.created_at))[1]   as sample_path
    from page_views pv
    where pv.created_at >= p_from and pv.created_at < p_to
    group by 1
  ),
  -- 한 쪽만 보고, 바깥에서 온 흔적도 없는 방문자. 크롤러의 기본 모양이다.
  oneshot as (
    select * from v where views = 1 and ext_views = 0
  ),
  scored as (
    select
      o.vid,
      -- 앞뒤 5분 안에 있는 '다른 주소를 연' 1회성 방문자의 수.
      -- 같은 주소를 본 이웃은 세지 않는다 — 단톡방 확산이 여기서 걸러진다.
      (
        select count(distinct o2.sample_path)::int
        from oneshot o2
        where o2.vid <> o.vid
          and o2.sample_path is distinct from o.sample_path
          and o2.first_at between o.first_at - interval '5 minutes'
                              and o.first_at + interval '5 minutes'
      ) as neighbors
    from oneshot o
  )
  select
    v.vid, v.first_at, v.last_at, v.ip_hash, v.user_agent, v.sample_path,
    case when is_bot_ua(v.user_agent) then '이름' else '훑는 모양' end as reason,
    coalesce(s.neighbors, 0) as neighbors
  from v
  left join scored s on s.vid = v.vid
  where is_bot_ua(v.user_agent)
     or coalesce(s.neighbors, 0) >= 5;
$$;

comment on function bot_visitors(timestamptz, timestamptz) is
  '기간 안에서 크롤러로 볼 방문자. 이름(is_bot_ua) 또는 훑는 모양으로 판정.';


-- ---------------------------------------------------------------------
-- 3. 판정을 기록에 적기
-- ---------------------------------------------------------------------
-- 최근 p_hours 시간을 통째로 다시 판정한다. true 만 칠하지 않고 false 도
-- 되돌린다 — 앞서 한 쪽만 봤던 사람이 나중에 두 번째 쪽을 열면 더는
-- 크롤러가 아니기 때문이다. 다시 볼 창을 24시간으로 둔 이유가 이것이다.
--
-- 창 밖의 오래된 기록은 건드리지 않는다. 그때 내린 판정이 그대로 남는다.
create or replace function mark_bot_visits(p_hours int default 24)
returns integer
language plpgsql
security definer set search_path = public as $$
declare
  v_from timestamptz := now() - make_interval(hours => greatest(coalesce(p_hours, 24), 1));
  n integer;
begin
  with bots as (
    select vid from bot_visitors(v_from, now())
  )
  update page_views pv
     set is_bot = (coalesce(pv.session_id, pv.ip_hash) in (select vid from bots))
   where pv.created_at >= v_from
     and pv.is_bot is distinct from
         (coalesce(pv.session_id, pv.ip_hash) in (select vid from bots));
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function mark_bot_visits(int) from public, anon, authenticated;
grant execute on function mark_bot_visits(int) to service_role;

comment on function mark_bot_visits(int) is
  '최근 N시간을 다시 판정해 page_views.is_bot 에 적는다. 바뀐 행 수를 돌려준다.';


-- ---------------------------------------------------------------------
-- 4. User-Agent 보유기간 — 90일
-- ---------------------------------------------------------------------
-- 브라우저 이름은 그 자체로 누구인지 알려주지 않지만, 드문 조합은 한 사람을
-- 가리키는 표지가 된다. 크롤러를 알아보는 데 필요한 기간만 두고 비운다.
-- 행은 지우지 않는다 — 지우면 과거 방문 수가 뚝 떨어진다.
--
-- 처리방침 §5에 같은 기간을 적었다(lib/legal.ts). 이 장치를 끄면 그 줄도
-- 함께 빼야 한다.
create or replace function purge_old_user_agents()
returns integer
language plpgsql
security definer set search_path = public as $$
declare n integer;
begin
  update page_views
     set user_agent = null
   where user_agent is not null
     and created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function purge_old_user_agents() from public, anon, authenticated;

-- 자동 실행 등록은 이 파일 맨 끝(10)에서 한다.


-- ---------------------------------------------------------------------
-- 5. 알림 기록 — 같은 일로 두 번 울리지 않게
-- ---------------------------------------------------------------------
-- automation/bot-watch.mjs 가 매시간 들여다보고, 새 크롤링이 있으면
-- 텔레그램으로 한 번 알린 뒤 여기에 적는다. 다음 번에는 여기 적힌
-- 시각보다 새로운 것만 본다.
create table if not exists bot_alerts (
  id            bigint generated always as identity primary key,
  detected_from timestamptz not null,
  detected_to   timestamptz not null,
  visitors      int not null,
  views         int not null,
  sample_ua     text,
  sample_paths  text[],
  notified_at   timestamptz not null default now()
);

create index if not exists bot_alerts_detected_to_idx on bot_alerts (detected_to desc);

alter table bot_alerts enable row level security;
drop policy if exists bot_alerts_read on bot_alerts;
create policy bot_alerts_read on bot_alerts for select using (is_staff());
-- 쓰기는 service_role 만. RLS 를 우회하므로 정책을 따로 두지 않는다.

comment on table bot_alerts is
  '크롤러 감지 알림을 보낸 기록. automation/bot-watch.mjs 가 중복 알림을 막는 데 쓴다.';


-- ---------------------------------------------------------------------
-- 6. 크롤러 요약 — 관리자 화면과 알림이 함께 쓴다
-- ---------------------------------------------------------------------
create or replace function bot_summary(p_days int default 30)
returns table (visitors bigint, views bigint)
language sql stable as $$
  select
    count(distinct coalesce(session_id, ip_hash)) as visitors,
    count(*)                                      as views
  from page_views
  where created_at >= kst_period_start(p_days)
    and is_bot;
$$;

revoke all on function bot_summary(int) from public, anon, authenticated;
grant execute on function bot_summary(int) to service_role;

comment on function bot_summary(int) is
  '기간 안에서 집계에서 빠진 크롤러의 방문자·조회 수.';


-- ---------------------------------------------------------------------
-- 7. 기존 집계 함수 — 봇을 빼고 센다
-- ---------------------------------------------------------------------
-- 아래 정의는 db/page-views-migration.sql · db/visit-analytics-migration.sql
-- 의 것과 같고, where 절에 `not is_bot` 한 줄씩만 더했다. 저 두 파일을
-- 다시 실행하면 이 조건이 사라지므로, 그때는 이 파일도 다시 실행할 것.

create or replace function daily_visit_stats(p_days int default 7)
returns table (day date, visitors bigint, views bigint)
language sql stable as $$
  select
    (pv.created_at at time zone 'Asia/Seoul')::date            as day,
    count(distinct coalesce(pv.session_id, pv.ip_hash))        as visitors,
    count(*)                                                   as views
  from page_views pv
  where pv.created_at >=
    (((now() at time zone 'Asia/Seoul')::date
      - (greatest(coalesce(p_days, 7), 1) - 1)) at time zone 'Asia/Seoul')
    and not pv.is_bot
  group by 1
  order by 1;
$$;

create or replace function visit_summary(p_days int default 30)
returns table (visitors bigint, views bigint, days_with_traffic bigint)
language sql stable as $$
  select
    count(distinct coalesce(session_id, ip_hash))                 as visitors,
    count(*)                                                      as views,
    count(distinct (created_at at time zone 'Asia/Seoul')::date)  as days_with_traffic
  from page_views
  where created_at >= kst_period_start(p_days)
    and not is_bot;
$$;

create or replace function top_paths(p_days int default 30, p_limit int default 30)
returns table (path text, views bigint, visitors bigint)
language sql stable as $$
  select
    pv.path,
    count(*)                                                as views,
    count(distinct coalesce(pv.session_id, pv.ip_hash))     as visitors
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
    and not pv.is_bot
  group by pv.path
  order by views desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

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
      and not pv.is_bot
  )
  select
    case
      when host = '' then '직접 방문'
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

create or replace function hourly_visit_stats(p_days int default 30)
returns table (hour int, views bigint, visitors bigint)
language sql stable as $$
  select
    extract(hour from (pv.created_at at time zone 'Asia/Seoul'))::int as hour,
    count(*)                                                as views,
    count(distinct coalesce(pv.session_id, pv.ip_hash))     as visitors
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
    and not pv.is_bot
  group by 1
  order by 1;
$$;

-- 기사별 조회는 article_views 에 쌓인다. 그쪽에는 방문자 쿠키 칸이 없어서
-- (db/schema.sql) 같은 기간에 크롤러로 판정된 IP를 빼는 것으로 대신한다.
-- 크롤러는 대개 체류·스크롤을 남기지 않아 여기까지 오는 일이 드물지만,
-- 오면 '읽지도 않고 조회수만 올린 기사'가 목록 위로 올라온다.
create or replace function article_view_stats(p_days int default 30, p_limit int default 50)
returns table (
  article_id uuid,
  views bigint,
  visitors bigint,
  avg_dwell_sec numeric,
  avg_scroll numeric
)
language sql stable as $$
  with bot_ips as (
    select distinct ip_hash
    from page_views
    where created_at >= kst_period_start(p_days) and is_bot
  )
  select
    av.article_id,
    count(*)                                               as views,
    count(distinct coalesce(av.user_id::text, av.ip_hash)) as visitors,
    round(avg(av.dwell_ms) / 1000.0, 1)                    as avg_dwell_sec,
    round(avg(av.scroll_pct), 0)                           as avg_scroll
  from article_views av
  where av.created_at >= kst_period_start(p_days)
    and av.article_id is not null
    and av.ip_hash not in (select ip_hash from bot_ips)
  group by av.article_id
  order by views desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

revoke all on function daily_visit_stats(int)       from public, anon, authenticated;
revoke all on function visit_summary(int)           from public, anon, authenticated;
revoke all on function top_paths(int, int)          from public, anon, authenticated;
revoke all on function top_referrers(int, int)      from public, anon, authenticated;
revoke all on function hourly_visit_stats(int)      from public, anon, authenticated;
revoke all on function article_view_stats(int, int) from public, anon, authenticated;
revoke all on function bot_visitors(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function is_bot_ua(text)              from public, anon, authenticated;

grant execute on function daily_visit_stats(int)       to service_role;
grant execute on function visit_summary(int)           to service_role;
grant execute on function top_paths(int, int)          to service_role;
grant execute on function top_referrers(int, int)      to service_role;
grant execute on function hourly_visit_stats(int)      to service_role;
grant execute on function article_view_stats(int, int) to service_role;
grant execute on function bot_visitors(timestamptz, timestamptz) to service_role;
grant execute on function is_bot_ua(text)              to service_role;


-- ---------------------------------------------------------------------
-- 8. 이미 쌓인 기록을 한 번 판정한다
-- ---------------------------------------------------------------------
-- 지금까지의 방문 기록 전체를 되짚는다. 앞뒤 5분을 훑는 계산이라 기록이
-- 아주 많으면 오래 걸린다. 지금은 수천 건 규모라 몇 초면 끝난다.
-- (나중에 다시 돌릴 일이 있으면 기간을 나눠서 부를 것)
select mark_bot_visits(24 * 400) as 다시_판정한_행수;

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- 9. 자동 실행 등록 — 맨 끝에 두는 이유
-- ---------------------------------------------------------------------
-- 여기서부터는 pg_cron 이 있어야 한다. 없으면 아래 네 줄만 실패하고
-- 위의 것들(판정 함수·집계 수정·이미 쌓인 기록 판정)은 이미 다 적용된
-- 뒤다. 그래서 맨 끝에 둔다 — 확장 하나 때문에 전부 되돌아가면 안 된다.
--
-- pg_cron 이 없다면: Database → Extensions → pg_cron → Enable 후 이 파일을
-- 다시 실행하면 된다. 켜지 않아도 크롤러 감시(automation/bot-watch.mjs)가
-- 두 시간마다 mark_bot_visits() 를 부르므로 집계는 유지된다. 다만
-- User-Agent 90일 파기는 pg_cron 이 있어야 자동으로 돈다.

-- 크롤러는 대개 새벽에 온다. 하루 한 번으로는 관리자 화면이 반나절 동안
-- 부풀려진 숫자를 보여주게 된다.
select cron.unschedule('mark-bot-visits')
 where exists (select 1 from cron.job where jobname = 'mark-bot-visits');

select cron.schedule(
  'mark-bot-visits',
  '5 * * * *',                       -- 매시 5분
  $$select mark_bot_visits(24)$$
);

-- 새벽 4시 20분(한국시각). 설문 IP 정리(4시 정각)·제출 IP 정리(4시 10분)와
-- 겹치지 않게 둔다. cron 은 UTC 기준이라 19시 20분으로 적는다.
select cron.unschedule('purge-old-user-agents')
 where exists (select 1 from cron.job where jobname = 'purge-old-user-agents');

select cron.schedule(
  'purge-old-user-agents',
  '20 19 * * *',
  $$select purge_old_user_agents()$$
);


-- ---------------------------------------------------------------------
-- 확인용
--
--   -- 오늘 사람과 크롤러
--   select * from daily_visit_stats(1);          -- 봇을 뺀 수
--   select * from bot_summary(1);                -- 빠진 수
--
--   -- 어젯밤에 무엇이 훑고 갔나
--   select first_at, reason, neighbors, sample_path, left(user_agent, 60)
--     from bot_visitors(now() - interval '24 hours')
--    order by first_at;
--
--   -- 등록된 작업
--   select jobname, schedule, active from cron.job;
-- ---------------------------------------------------------------------
