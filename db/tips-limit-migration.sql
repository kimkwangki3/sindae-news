-- =====================================================================
--  제보 남용 방지 — IP별 하루 제한 + 로그인 필수
--
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  지금까지 제보는 로그인 없이 누구나, 몇 건이든 보낼 수 있었다.
--  앞으로는 카카오 로그인을 한 사람만, 같은 IP에서 하루 정해진 건수까지만
--  보낼 수 있다. 발행인이 제보자에게 연락할 수 있어야 하기 때문이다.
--
--  IP는 원문을 저장하지 않고 단방향 해시로만 남긴다(개인정보 최소 수집).
--  해시는 되돌릴 수 없어 "같은 곳에서 또 보냈는가"만 판별할 수 있다.
-- =====================================================================

alter table tips add column if not exists ip_hash text;

comment on column tips.ip_hash is
  '제보자 IP의 단방향 해시. 하루 제출 건수 제한에만 쓴다. 원문 IP는 저장하지 않는다.';

-- 하루치 건수를 세는 조회이므로 (해시, 시각) 순으로 인덱스를 둔다.
create index if not exists tips_ip_hash_created_idx
  on tips (ip_hash, created_at desc);

-- 제보자 기준 건수 조회용.
create index if not exists tips_reporter_created_idx
  on tips (reporter_id, created_at desc);

-- 비로그인 제보를 더 이상 받지 않는다. 로그인한 사람이 본인 이름으로만 넣을 수 있다.
-- (건수 제한은 앱에서 service_role로 세어 판단한다 — 제보 목록은 관리자만 읽을 수
--  있어야 하므로 회원이 직접 세어볼 수는 없다.)
drop policy if exists tip_insert on tips;
create policy tip_insert on tips for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());

notify pgrst, 'reload schema';
