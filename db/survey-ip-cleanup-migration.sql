-- =====================================================================
--  해룡신문 — 설문 IP 해시 90일 후 자동 삭제
--  Supabase SQL Editor에 붙여넣고 실행.
--
--  ※ 먼저 대시보드에서 pg_cron 확장을 켜야 한다.
--     Database → Extensions → pg_cron 검색 → Enable
--
--  왜 필요한가
--   * 설문 투표에는 ip_hash 를 남긴다. 원본 IP가 아니라 소금과 섞은 해시라
--     되돌릴 수는 없지만, "같은 회선에서 온 표인지"는 알 수 있다. 그게 이
--     값을 남기는 유일한 이유다 — 한 집에서 계정 여럿으로 몰표를 넣는지
--     보려는 것.
--   * 그 쓸모는 조사가 진행되는 동안뿐이다. 끝난 조사의 회선 정보를 계속
--     들고 있을 이유가 없고, 개인정보는 쓸 일이 없어지면 지우는 것이 원칙이다.
--   * 명세서(1-4, 12장)가 90일을 정해 두었다.
--
--  지우는 방식
--   * 행을 지우지 않는다. ip_hash 만 null 로 비운다. 행을 지우면 그 표가
--     사라져 집계(total_votes·vote_count)와 어긋나고, 1인 1표를 지키는
--     UNIQUE(survey_id, user_id) 도 함께 풀려 같은 사람이 다시 투표할 수
--     있게 된다. 지워야 할 것은 '누가 어느 회선에서 왔는가'이지 '표'가 아니다.
-- =====================================================================

-- 1) 지우는 일을 하는 함수.
--    security definer 로 두어 cron 이 어떤 권한으로 돌든 같게 동작하게 한다.
create or replace function purge_survey_ip_hashes() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update survey_votes
     set ip_hash = null
   where ip_hash is not null
     and created_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function purge_survey_ip_hashes() from public;

-- 2) 매일 새벽 4시(한국시각)에 돌린다. cron 은 UTC 기준이라 19시로 적는다.
--    한가한 시간에 두는 이유는 이 작업이 무거워서가 아니라, 조사가 한창인
--    낮에 무언가를 건드리는 일을 만들지 않으려는 것이다.
--
--    같은 이름으로 이미 등록돼 있으면 지우고 다시 만든다(재실행 안전).
select cron.unschedule('purge-survey-ip-hashes')
 where exists (
   select 1 from cron.job where jobname = 'purge-survey-ip-hashes'
 );

select cron.schedule(
  'purge-survey-ip-hashes',
  '0 19 * * *',
  $$select purge_survey_ip_hashes()$$
);

-- ---------------------------------------------------------------------
-- 확인용
--
--   -- 등록된 작업 보기
--   select jobname, schedule, active from cron.job;
--
--   -- 최근 실행 기록
--   select jobname, status, return_message, start_time
--     from cron.job_run_details order by start_time desc limit 5;
--
--   -- 지금 당장 한 번 돌려보기(90일 지난 것이 없으면 0을 돌려준다)
--   select purge_survey_ip_hashes();
--
--   -- 남아 있는 해시 개수
--   select count(*) from survey_votes where ip_hash is not null;
-- ---------------------------------------------------------------------
