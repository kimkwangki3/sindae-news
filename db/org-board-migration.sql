-- =====================================================================
--  해룡신문 — 단체 소식을 게시판으로 일원화
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  기존: 단체 소식이 org_posts라는 별도 테이블에 쌓여 단체 상세에서만 보였다.
--  변경: 게시판(board_posts)에 org_id를 달아 같은 글로 취급한다.
--        · 동네 사람들이 보는 게시판에 단체 활동이 함께 노출된다
--        · 단체 상세에서는 org_id로 걸러 그 단체 글만 보여준다
--
--  org_posts는 현재 0건이라 옮길 데이터가 없다. 테이블은 남겨 두되
--  더 이상 쓰지 않는다(되돌릴 때를 대비).
-- =====================================================================

alter table board_posts
  add column if not exists org_id uuid references organizations(id) on delete set null;

comment on column board_posts.org_id is '단체 명의로 올린 글이면 해당 단체. 일반 글은 null';

create index if not exists board_posts_org_idx
  on board_posts (org_id, created_at desc);

grant select (org_id) on board_posts to anon, authenticated;

notify pgrst, 'reload schema';
