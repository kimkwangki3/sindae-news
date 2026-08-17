-- =====================================================================
--  해룡신문 — 개인정보 보유기간 정리
--  Supabase SQL Editor에 붙여넣고 실행. 여러 번 실행해도 안전하다.
--
--  ※ 아래 2)는 pg_cron 이 필요하다. 설문 IP 정리(survey-ip-cleanup-migration.sql)
--    를 이미 적용했다면 켜져 있다. 아니면 Database → Extensions → pg_cron → Enable.
--
--  왜 필요한가
--   처리방침에 적은 보유기간은 코드가 실제로 지킬 때에만 적을 수 있는 문장이다.
--   지금은 두 곳이 약속 없이 쌓이고 있었다.
--
--   1) page_views.user_id — "이 회원이 언제 어느 기사를 봤는가"의 기록.
--      읽는 화면이 하나도 없는데(집계는 session_id·ip_hash 로 한다) 저장만
--      되고 있었고, 지우는 장치도 없어 사실상 영구 보관이었다.
--      쓰지 않는 개인정보는 남길 이유가 없다 → 아예 기록을 끊고(코드:
--      lib/visit-actions.ts) 기존 값도 비운다.
--
--   2) 제보(tips.reporter_ip)·기자 신청(reporter_applications.agreed_ip)의
--      접속 IP — 이쪽은 지워선 안 되는 이유가 있다. 책임 서약과 접수 사실의
--      증빙이라 분쟁이 났을 때 필요하다. 다만 영원히 필요한 것은 아니므로
--      3년으로 끊는다(처리방침 §5에 같은 기간을 적었다).
-- =====================================================================

-- 1) 이미 쌓인 열람 이력의 회원 연결을 끊는다.
--    행은 남긴다 — 방문 수 집계가 과거만 뚝 떨어지면 안 된다.
update page_views set user_id = null where user_id is not null;

-- 2) 증빙용 접속 IP를 3년 뒤 비우는 함수.
--    행을 지우지 않고 IP 칸만 비운다. 제보·신청 내용 자체는 기사와 심사의
--    근거라 남겨야 한다. 지워야 할 것은 '어느 회선에서 왔는가'다.
create or replace function purge_old_submission_ips() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_tips integer;
  v_apps integer;
begin
  update tips
     set reporter_ip = null
   where reporter_ip is not null
     and created_at < now() - interval '3 years';
  get diagnostics v_tips = row_count;

  update reporter_applications
     set agreed_ip = null
   where agreed_ip is not null
     and created_at < now() - interval '3 years';
  get diagnostics v_apps = row_count;

  return v_tips + v_apps;
end;
$$;

revoke all on function purge_old_submission_ips() from public;

-- 3) 매일 새벽 4시 10분(한국시각). 설문 IP 정리(4시 정각)와 겹치지 않게 둔다.
--    cron 은 UTC 기준이라 19시 10분으로 적는다.
select cron.unschedule('purge-old-submission-ips')
 where exists (
   select 1 from cron.job where jobname = 'purge-old-submission-ips'
 );

select cron.schedule(
  'purge-old-submission-ips',
  '10 19 * * *',
  $$select purge_old_submission_ips()$$
);

-- ---------------------------------------------------------------------
-- 확인용
--
--   -- 회원 연결이 남아 있는 열람 기록(0이어야 한다)
--   select count(*) from page_views where user_id is not null;
--
--   -- 지금 한 번 돌려보기(3년 지난 것이 없으면 0)
--   select purge_old_submission_ips();
--
--   -- 등록된 작업
--   select jobname, schedule, active from cron.job;
-- ---------------------------------------------------------------------
