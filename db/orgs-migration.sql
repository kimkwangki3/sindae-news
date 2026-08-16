-- =====================================================================
--  해룡신문 — 지역단체: 이름 중복 차단 + 운영진 직접 수정
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  두 가지를 함께 넣는다.
--   1) 같은 이름으로 두 번 등록되지 않게 막는다.
--   2) 단체 운영진이 자기 단체 소개를 직접 고칠 수 있게 연다.
--      단, 단체명은 잠근다 — 그래야 1)의 약속이 유지된다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 이름 중복 차단
-- ---------------------------------------------------------------------
-- 같은 단체가 여러 번 등록되면 주민이 어디에 가입해야 할지 알 수 없고, 회원과
-- 게시글이 두 곳으로 갈린다. 관리자 목록에도 같은 이름이 줄줄이 쌓인다.
--
-- 앱에서도 등록 전에 확인하지만 그것만으로는 부족하다. 두 사람이 동시에 같은
-- 이름을 넣으면 둘 다 "없음"을 보고 둘 다 저장된다. 마지막 방어선은 여기다.
--
-- 띄어쓰기와 대소문자를 무시하고 비교한다. "신대지구 발전위원회"와
-- "신대지구발전위원회"는 사람이 보기에 같은 단체인데, 글자만 견주면 둘 다
-- 통과한다.
--
-- 거절된 단체는 빼둔다. 거절이 "이 이름을 영원히 못 쓴다"가 되면, 잘못 넣어
-- 거절된 신청 때문에 진짜 단체가 자기 이름으로 등록하지 못한다.

-- 이미 들어와 있는 중복부터 정리한다. 인덱스는 중복이 하나라도 있으면
-- 만들어지지 않는다.
--
-- 지우지 않고 '거절'로 돌린다. 삭제하면 딸린 회원·사진·게시글이 함께
-- 사라지는데, 어느 쪽이 진짜인지는 사람이 봐야 안다. 관리자 화면의 '거절'
-- 목록에 남으니 확인하고 되살리거나 지우면 된다.
--
-- 남기는 기준: 승인된 것 우선, 그다음 먼저 등록된 것.
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(regexp_replace(name, '\s+', '', 'g'))
      order by (status = 'approved') desc, created_at
    ) as rn
  from organizations
  where status <> 'rejected'
)
update organizations o
   set status = 'rejected'
  from ranked r
 where o.id = r.id
   and r.rn > 1;

create unique index if not exists organizations_name_uniq
  on organizations (lower(regexp_replace(name, '\s+', '', 'g')))
  where status <> 'rejected';

-- ---------------------------------------------------------------------
-- 2. 운영진이 자기 단체를 고칠 수 있게
-- ---------------------------------------------------------------------
-- 지금 정책은 owner_id 본인이거나 사이트 관리자만 수정할 수 있다. 그래서
-- 단체에서 운영진(staff)으로 세운 사람이 소개 한 줄도 못 고쳤다.
-- is_org_staff() 는 이미 있는 함수다(db/rls.sql) — owner·staff 를 함께 본다.
drop policy if exists org_modify on organizations;
create policy org_modify on organizations
  for update using (
    owner_id = auth.uid() or is_org_staff(id) or is_staff()
  );

-- ---------------------------------------------------------------------
-- 3. 단체명은 잠근다
-- ---------------------------------------------------------------------
-- 수정을 열어주면 이름도 함께 열린다. 그러면 위에서 막은 중복이 '등록'이
-- 아니라 '수정'으로 되살아나고, 무엇보다 주민이 가입한 단체의 이름이 어느 날
-- 다른 것으로 바뀌어 있을 수 있다. 이름은 단체를 가리키는 이름표지 설명이
-- 아니다.
--
-- 잠그되 오타를 고칠 손은 남겨 둔다. 신고가 들어왔는데 아무도 못 고치면
-- 그것도 곤란하다.
--
-- 누구를 막는가를 '역할'로 가른다. 브라우저에서 오는 요청(anon·authenticated)만
-- 막고, 서버가 비밀 키로 부르는 경로(service_role)와 SQL 에디터는 통과시킨다.
--   · is_staff() 만으로 가르면 안 된다. 관리자 화면은 service_role 로 도는데
--     그때는 auth.uid() 가 없어 is_staff() 가 거짓이 된다 — 관리자까지 막힌다.
--   · service_role 키는 서버 환경변수에만 있다. 그 키로 부를 수 있다는 것은
--     이미 우리 서버 코드라는 뜻이고, 거기서 다시 권한을 확인한다.
create or replace function org_name_is_locked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.name is distinct from old.name
     and coalesce(auth.role(), 'postgres') in ('anon', 'authenticated')
     and not is_staff() then
    raise exception '단체명은 변경할 수 없습니다. 수정이 필요하면 해룡신문에 문의해 주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_name_locked on organizations;
create trigger organizations_name_locked
  before update on organizations
  for each row execute function org_name_is_locked();

-- ---------------------------------------------------------------------
-- 확인용 — 실행 후 아래가 0건이어야 한다.
--
--   select lower(regexp_replace(name,'\s+','','g')) as key, count(*)
--     from organizations where status <> 'rejected'
--    group by 1 having count(*) > 1;
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
