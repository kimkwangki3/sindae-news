-- =====================================================================
--  해룡신문 — 기사 조회수 집계 보정
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  문제: 조회 로그(article_views)는 정상 적재되는데 articles.view_count를
--        올리는 곳이 없어 화면 조회수가 계속 0으로 보였다.
--
--  해결: 원자적으로 1 올리는 security definer 함수를 두고 앱이 호출한다.
--        articles UPDATE를 anon에게 열지 않고 이 함수만 실행 권한을 준다.
-- =====================================================================

create or replace function increment_article_view(p_article_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update articles
     set view_count = coalesce(view_count, 0) + 1
   where id = p_article_id;
$$;

revoke all on function increment_article_view(uuid) from public;
grant execute on function increment_article_view(uuid) to anon, authenticated;

-- 기존 조회 로그를 반영해 현재 값을 맞춘다(그동안 쌓인 기록 복구).
update articles a
   set view_count = (
     select count(*) from article_views v where v.article_id = a.id
   );

notify pgrst, 'reload schema';
