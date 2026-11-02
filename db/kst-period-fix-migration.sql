-- =====================================================================
--  해룡신문 — 집계 기간 시작을 한국시간 자정으로 바로잡기
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  왜 필요한가
--   * date 값에 곧바로 at time zone 을 붙이면 date 가 UTC timestamptz 로
--     먼저 바뀐 뒤 한국시각으로 옮겨진다. 그 결과 '오늘 00:00(KST)' 이어야 할
--     기간 시작이 '오늘 18:00(KST)' 이 되어 있었다.
--   * 그래서 7일·30일 집계는 첫날 18시간이 통째로 빠졌고(대시보드의 맨 왼쪽
--     막대만 짧던 이유), 2026-11-02 '오늘' 기간을 넣자 18시 전까지 0으로 나왔다.
--   * ::timestamp 로 먼저 바꾸면 그 날짜의 한국시각 자정이 된다.
-- =====================================================================

create or replace function kst_period_start(p_days int)
returns timestamptz
language sql stable as $$
  select (((now() at time zone 'Asia/Seoul')::date
           - (greatest(coalesce(p_days, 7), 1) - 1))::timestamp at time zone 'Asia/Seoul');
$$;

create or replace function daily_visit_stats(p_days int default 7)
returns table (day date, visitors bigint, views bigint)
language sql stable as $$
  select
    (pv.created_at at time zone 'Asia/Seoul')::date            as day,
    count(distinct coalesce(pv.session_id, pv.ip_hash))        as visitors,
    count(*)                                                   as views
  from page_views pv
  where pv.created_at >= kst_period_start(p_days)
    and not pv.is_bot
  group by 1
  order by 1;
$$;

-- 고정 검증. 시작 시각은 과거여야 하고, 한국시각 자정이어야 한다.
do $$
begin
  assert kst_period_start(1) <= now();
  assert kst_period_start(1) > now() - interval '1 day';
  assert (kst_period_start(1) at time zone 'Asia/Seoul')::time = time '00:00';
  assert (kst_period_start(7) at time zone 'Asia/Seoul')::time = time '00:00';
end;
$$;

revoke all on function kst_period_start(int)  from public, anon, authenticated;
revoke all on function daily_visit_stats(int) from public, anon, authenticated;
grant execute on function kst_period_start(int)  to service_role;
grant execute on function daily_visit_stats(int) to service_role;

notify pgrst, 'reload schema';

-- 확인용 (한국시각 오늘 00:00 이 나와야 한다)
--   select kst_period_start(1) at time zone 'Asia/Seoul';
--   select * from visit_summary(1);
