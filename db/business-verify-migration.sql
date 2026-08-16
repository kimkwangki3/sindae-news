-- =====================================================================
--  해룡신문 — 업체 사업자 확인 기록 + 업체명 잠금
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  왜 필요한가
--   * 등록할 때 사업자등록번호를 받아 두고 있었는데, 그 값을 볼 수 있는 화면이
--     어디에도 없었다. 받아만 놓고 아무도 확인하지 않은 것이다.
--     상권 목록은 주민이 "여기는 신문이 확인한 곳"이라 믿고 보는 자리라,
--     확인을 했는지 안 했는지가 남아야 한다.
--   * 언제·누가 확인했는지를 남긴다. "확인함"이라는 사실만 있고 누가 했는지
--     없으면 나중에 문제가 생겼을 때 아무것도 되짚을 수 없다.
-- =====================================================================

alter table businesses
  add column if not exists biz_verified_at timestamptz,
  add column if not exists biz_verified_by uuid references profiles(id);

comment on column businesses.biz_verified_at is
  '사업자등록번호를 사람이 국세청에서 대조해 확인한 시각. null이면 미확인';
comment on column businesses.biz_verified_by is
  '확인한 관리자';

-- 공개 화면은 '확인됨' 배지만 보여주면 되므로 시각만 읽게 한다.
-- 사업자등록번호(biz_reg_no)와 확인한 사람은 절대 열지 않는다 —
-- 등록번호는 등록할 때부터 '확인용·비공개'로 받은 값이다.
grant select (biz_verified_at) on businesses to anon, authenticated;

-- ---------------------------------------------------------------------
-- 업체명 잠금
-- ---------------------------------------------------------------------
-- 업체 정보를 사장님이 직접 고칠 수 있게 열면 상호도 함께 열린다. 그러면
-- 분식집으로 승인받아 놓고 다른 이름으로 바꿔 다는 일이 가능해진다. 신문이
-- 확인해 실어 준 것은 '그 이름의 그 가게'다.
--
-- 지역단체와 같은 방식으로 가른다(db/orgs-migration.sql). 브라우저에서 오는
-- 요청만 막고, 서버가 비밀 키로 부르는 관리자 경로는 통과시킨다.
-- 상호가 실제로 바뀌었다면 해룡신문에 알려 고치면 된다.
create or replace function biz_name_is_locked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name
     and coalesce(auth.role(), 'postgres') in ('anon', 'authenticated')
     and not is_staff() then
    raise exception '업체명은 변경할 수 없습니다. 상호가 바뀌었다면 해룡신문에 문의해 주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_name_locked on businesses;
create trigger businesses_name_locked
  before update on businesses
  for each row execute function biz_name_is_locked();

-- ---------------------------------------------------------------------
-- 사장님이 고친 뒤 스스로 승인 상태를 바꾸지 못하게
-- ---------------------------------------------------------------------
-- biz_modify 정책은 owner 에게 update 를 통째로 허용한다. 그대로 두면 등록만
-- 해놓고 status 를 'approved' 로 바꿔 승인을 건너뛸 수 있다. 확인 기록도
-- 스스로 찍을 수 있다. 그건 관리자만 할 일이다.
create or replace function biz_review_is_locked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), 'postgres') in ('anon', 'authenticated')
     and not is_staff()
     and (new.status          is distinct from old.status
       or new.biz_verified_at is distinct from old.biz_verified_at
       or new.biz_verified_by is distinct from old.biz_verified_by
       or new.reviewed_by     is distinct from old.reviewed_by) then
    raise exception '승인·확인 상태는 관리자만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_review_locked on businesses;
create trigger businesses_review_locked
  before update on businesses
  for each row execute function biz_review_is_locked();

-- 같은 구멍이 지역단체에도 있다. 단체 운영진에게 update 를 열어 준 김에
-- 함께 막는다.
create or replace function org_review_is_locked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), 'postgres') in ('anon', 'authenticated')
     and not is_staff()
     and (new.status      is distinct from old.status
       or new.reviewed_by is distinct from old.reviewed_by) then
    raise exception '승인 상태는 관리자만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_review_locked on organizations;
create trigger organizations_review_locked
  before update on organizations
  for each row execute function org_review_is_locked();

notify pgrst, 'reload schema';
