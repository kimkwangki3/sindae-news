-- =====================================================================
--  해룡신문 — 지역단체 설립 연도
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  왜 필요한가
--   * 단체 페이지에 "2026년~"이라고 떠 있었는데, 그건 단체가 시작된 해가
--     아니라 우리 사이트에 등록한 해(created_at)였다. 20년 된 자치회가
--     올해 생긴 모임처럼 보인다. 지역 단체에서 연혁은 그 자체로 정보다.
--   * 사실이 아닌 값을 그럴듯하게 보여주느니 안 보여주는 편이 낫다. 그래서
--     null 을 허용하고, 적지 않은 단체는 연도를 아예 표시하지 않는다.
--     created_at 으로 대신 채우지 않는다 — 그게 지금의 문제다.
-- =====================================================================

alter table organizations
  add column if not exists founded_year smallint;

comment on column organizations.founded_year is
  '단체가 시작된 해(서기). 등록일(created_at)과 다르다. 모르면 null';

-- 있을 수 없는 값을 막는다. 네 자리가 아닌 값(202, 20260)이 들어오면 화면이
-- 깨진다.
--
-- 상한을 '올해'로 잡고 싶지만 CHECK 제약에는 지금 시각을 묻는 함수를 쓸 수
-- 없다(immutable 이 아니면 거부된다). 그래서 여기서는 자리수만 지키고,
-- "내년 이후는 오타" 같은 판단은 앱에서 한다(lib/local-actions.ts).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_founded_year_chk'
  ) then
    alter table organizations
      add constraint organizations_founded_year_chk
      check (founded_year is null or founded_year between 1900 and 2100);
  end if;
end $$;

-- 공개 화면이 읽어야 하므로 컬럼 단위 select 권한을 더한다
-- (기존 태그·블록 마이그레이션과 같은 방식).
grant select (founded_year) on organizations to anon, authenticated;

notify pgrst, 'reload schema';
