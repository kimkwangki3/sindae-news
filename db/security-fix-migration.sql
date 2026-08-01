-- =====================================================================
--  보안 수정 — 2026-08-01 점검에서 확인된 권한 우회 3건
--
--  Supabase SQL Editor에 통째로 붙여넣고 실행. 재실행 안전.
--
--  발견 경위: 실제 테스트 계정으로 API를 직접 호출해 확인했다.
--  세 건 모두 화면(앱)에서는 막혀 있었지만 DB 수준에서는 열려 있었다.
--  앱을 거치지 않고 Supabase API를 직접 부르면 그대로 통과했다.
--
--   1) 가입만 한 일반 회원이 status='published' 기사를 직접 넣을 수 있었다.
--      → 해룡신문 이름으로 아무 글이나 게재 가능. 발행인이 법적 책임을 진다.
--   2) 업체(businesses)를 등록한 뒤 스스로 status='approved'로 바꿀 수 있었다.
--   3) 단체(organizations)도 마찬가지였다.
--
--  RLS 정책만으로는 "어떤 컬럼을 어떤 값으로 바꾸는가"를 막기 어렵다.
--  (UPDATE 정책의 WITH CHECK는 이전 값을 볼 수 없다) 그래서 트리거로 막는다.
-- =====================================================================

-- service_role(서버 전용 키)로 들어오는 요청은 관리자 작업이므로 통과시킨다.
-- 관리자 화면·텔레그램 발행·시드 스크립트가 전부 이 경로다.
--
-- current_user 로 판별하므로 이 함수를 부르는 트리거에 security definer 를
-- 붙이면 안 된다(그 안에서는 소유자 이름으로 바뀐다). JWT 클레임도 함께 보아
-- 키 형식이 달라져도 판별이 되게 한다.
create or replace function is_service_role() returns boolean as $$
  select current_user = 'service_role'
      or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$ language sql stable;

-- 로그인한 사람의 기자 등급. profiles는 컬럼 단위로 권한이 잠겨 있어
-- security definer로 우회해 읽는다.
create or replace function my_reporter_level() returns text as $$
  select reporter_level::text from profiles where id = auth.uid();
$$ language sql stable security definer;

grant execute on function is_service_role() to anon, authenticated;
grant execute on function my_reporter_level() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. 기사 — 시민기자만 쓸 수 있고, 즉시 발행은 정기자만
-- ---------------------------------------------------------------------
--  applicant(기자신청자)  작성 불가
--  junior(준기자)        pending 까지만. 관리자 승인 후 발행
--  senior(정기자)        즉시 발행 가능
--  admin/superadmin      전권
create or replace function guard_article_write() returns trigger as $$
declare lvl text;
begin
  if is_service_role() or is_staff() then
    return new;
  end if;

  lvl := my_reporter_level();
  if lvl is null or lvl = 'applicant' then
    raise exception '기사 작성 권한이 없습니다.' using errcode = '42501';
  end if;

  if new.author_id is distinct from auth.uid() then
    raise exception '다른 사람 이름으로 기사를 쓸 수 없습니다.' using errcode = '42501';
  end if;

  if new.status = 'published' and lvl <> 'senior' then
    raise exception '준기자는 바로 발행할 수 없습니다. 승인 요청으로 제출하세요.'
      using errcode = '42501';
  end if;

  return new;
end;
-- ⚠️ security definer 를 붙이면 안 된다. 그 안에서는 current_user 가 호출자가
--    아니라 함수 소유자(postgres)로 바뀌어 is_service_role() 이 항상 거짓이 되고,
--    관리자 작업까지 막힌다. 권한이 필요한 조회는 아래 두 함수가 대신한다.
$$ language plpgsql;

drop trigger if exists trg_guard_article_write on articles;
create trigger trg_guard_article_write
  before insert or update on articles
  for each row execute function guard_article_write();

-- ---------------------------------------------------------------------
-- 2·3. 업체·단체 — 승인 상태는 관리자만
-- ---------------------------------------------------------------------
-- 등록은 누구나 할 수 있되 항상 심사 대기로 들어가고, 승인은 관리자만 한다.
create or replace function guard_review_status() returns trigger as $$
begin
  if is_service_role() or is_staff() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';           -- 등록 시 승인 상태를 지정해도 무시한다
  elsif new.status is distinct from old.status then
    raise exception '승인 상태는 관리자만 변경할 수 있습니다.' using errcode = '42501';
  end if;

  return new;
end;
-- ⚠️ security definer 를 붙이면 안 된다. 그 안에서는 current_user 가 호출자가
--    아니라 함수 소유자(postgres)로 바뀌어 is_service_role() 이 항상 거짓이 되고,
--    관리자 작업까지 막힌다. 권한이 필요한 조회는 아래 두 함수가 대신한다.
$$ language plpgsql;

drop trigger if exists trg_guard_business_status on businesses;
create trigger trg_guard_business_status
  before insert or update on businesses
  for each row execute function guard_review_status();

drop trigger if exists trg_guard_org_status on organizations;
create trigger trg_guard_org_status
  before insert or update on organizations
  for each row execute function guard_review_status();

-- 업체 홍보글도 관리자 승인을 거친다(같은 규칙).
drop trigger if exists trg_guard_promo_status on promo_posts;
create trigger trg_guard_promo_status
  before insert or update on promo_posts
  for each row execute function guard_review_status();

notify pgrst, 'reload schema';
