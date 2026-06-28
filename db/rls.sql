-- =====================================================================
-- 신대신문 RLS 정책 (배포 전 보안)  — Supabase SQL Editor에서 실행
-- =====================================================================
-- 전제
--  * 관리자 화면/액션은 service_role 키로 동작 → RLS를 우회한다.
--    따라서 이 파일은 anon(비로그인)·authenticated(일반회원)만 대상으로 한다.
--  * 이미 정책이 있는 articles/comments/market_posts/reports는 건드리지 않는다.
--  * 재실행 안전: 헬퍼는 create or replace, 정책은 drop ... if exists 후 create.
--  * "운영진/소유자" 판정은 RLS 무한재귀를 피하려 security definer 함수로 분리.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 헬퍼 함수 (security definer = 호출자 권한 무시하고 정의자 권한으로 조회)
-- ---------------------------------------------------------------------
-- is_staff()는 schema.sql에 이미 존재.

create or replace function is_org_staff(p_org uuid) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = p_org
      and user_id = auth.uid()
      and status = 'approved'
      and role in ('owner','staff')
  );
$$ language sql stable security definer;

create or replace function owns_business(p_biz uuid) returns boolean as $$
  select exists (
    select 1 from businesses
    where id = p_biz and owner_id = auth.uid()
  );
$$ language sql stable security definer;

grant execute on function is_org_staff(uuid) to anon, authenticated;
grant execute on function owns_business(uuid) to anon, authenticated;

-- 핫소식 집계 RPC — article_views 원본을 노출하지 않고 집계 결과만 반환.
create or replace function hot_articles(period_days int, lim int default 10)
returns table(article_id uuid, views bigint)
language sql stable security definer as $$
  select v.article_id, count(*)::bigint as views
  from article_views v
  join articles a on a.id = v.article_id and a.status = 'published'
  where v.created_at >= now() - make_interval(days => period_days)
  group by v.article_id
  order by views desc
  limit lim;
$$;
grant execute on function hot_articles(int, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. profiles — 공개 닉네임 조인 허용, 민감 컬럼은 컬럼레벨 차단
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
drop policy if exists profile_read   on profiles;
drop policy if exists profile_insert on profiles;
drop policy if exists profile_update on profiles;
create policy profile_read on profiles
  for select using (deleted_at is null or id = auth.uid() or is_staff());
create policy profile_insert on profiles
  for insert with check (id = auth.uid());
create policy profile_update on profiles
  for update using (id = auth.uid() or is_staff());

-- 민감 컬럼 차단: 테이블 전체 SELECT가 있으면 컬럼 revoke가 무효 →
-- 테이블 SELECT를 회수하고 공개해도 되는 컬럼만 다시 GRANT.
-- (phone, kakao_id, suspend_reason, suspend_until은 제외 → 관리자는 service_role로 조회)
revoke select on profiles from anon, authenticated;
grant select (
  id, nickname, nickname_set_at, neighborhood, avatar_url,
  role, is_suspended, deleted_at, created_at
) on profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. nickname_history — 본인/관리자만
-- ---------------------------------------------------------------------
alter table nickname_history enable row level security;
drop policy if exists nick_read   on nickname_history;
drop policy if exists nick_insert on nickname_history;
create policy nick_read on nickname_history
  for select using (user_id = auth.uid() or is_staff());
create policy nick_insert on nickname_history
  for insert with check (user_id = auth.uid() or is_staff());

-- ---------------------------------------------------------------------
-- 3. categories — 공개 읽기 전용
-- ---------------------------------------------------------------------
alter table categories enable row level security;
drop policy if exists category_read on categories;
create policy category_read on categories for select using (true);

-- ---------------------------------------------------------------------
-- 4. 분석 로그 — 익명 INSERT 허용, SELECT는 staff만(집계는 RPC로)
-- ---------------------------------------------------------------------
alter table article_views enable row level security;
drop policy if exists aview_insert on article_views;
drop policy if exists aview_read   on article_views;
create policy aview_insert on article_views for insert with check (true);
create policy aview_read   on article_views for select using (is_staff());

alter table page_views enable row level security;
drop policy if exists pview_insert on page_views;
drop policy if exists pview_read   on page_views;
create policy pview_insert on page_views for insert with check (true);
create policy pview_read   on page_views for select using (is_staff());

-- ---------------------------------------------------------------------
-- 5. article_reactions — 집계는 공개 읽기, IP당 1회(앱+unique 제약)
--    주의: IP 기반 익명 반응이라 RLS로 소유자 식별 불가 → 쓰기 허용.
--    unique(article_id, ip_hash)로 중복은 막힘. 향후 rate-limit RPC 권장.
-- ---------------------------------------------------------------------
alter table article_reactions enable row level security;
drop policy if exists reaction_read   on article_reactions;
drop policy if exists reaction_insert on article_reactions;
drop policy if exists reaction_update on article_reactions;
drop policy if exists reaction_delete on article_reactions;
create policy reaction_read   on article_reactions for select using (true);
create policy reaction_insert on article_reactions for insert with check (true);
create policy reaction_update on article_reactions for update using (true);
create policy reaction_delete on article_reactions for delete using (true);

-- ---------------------------------------------------------------------
-- 6. 제보 / 기자모집 — 누구나 신청(insert), 조회는 staff
-- ---------------------------------------------------------------------
alter table tips enable row level security;
drop policy if exists tip_insert on tips;
drop policy if exists tip_read   on tips;
create policy tip_insert on tips for insert with check (true);
create policy tip_read   on tips for select using (is_staff());

alter table reporter_applications enable row level security;
drop policy if exists rapp_insert on reporter_applications;
drop policy if exists rapp_read   on reporter_applications;
create policy rapp_insert on reporter_applications for insert with check (true);
create policy rapp_read   on reporter_applications
  for select using (user_id = auth.uid() or is_staff());

-- ---------------------------------------------------------------------
-- 7. 나눔마켓 사진/댓글 (market_posts는 기존 정책 유지)
-- ---------------------------------------------------------------------
alter table market_photos enable row level security;
drop policy if exists mphoto_read   on market_photos;
drop policy if exists mphoto_write  on market_photos;
create policy mphoto_read on market_photos for select using (true);
create policy mphoto_write on market_photos for all
  using (is_staff() or exists (
    select 1 from market_posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (is_staff() or exists (
    select 1 from market_posts p where p.id = post_id and p.author_id = auth.uid()));

alter table market_comments enable row level security;
drop policy if exists mcomment_read   on market_comments;
drop policy if exists mcomment_insert on market_comments;
drop policy if exists mcomment_modify on market_comments;
create policy mcomment_read on market_comments
  for select using (visibility = 'visible' or author_id = auth.uid() or is_staff());
create policy mcomment_insert on market_comments
  for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy mcomment_modify on market_comments
  for update using (author_id = auth.uid() or is_staff());

-- ---------------------------------------------------------------------
-- 8. 자유게시판
-- ---------------------------------------------------------------------
alter table board_posts enable row level security;
drop policy if exists bpost_read   on board_posts;
drop policy if exists bpost_insert on board_posts;
drop policy if exists bpost_modify on board_posts;
create policy bpost_read on board_posts
  for select using (visibility = 'visible' or author_id = auth.uid() or is_staff());
create policy bpost_insert on board_posts
  for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy bpost_modify on board_posts
  for update using (author_id = auth.uid() or is_staff());

alter table board_photos enable row level security;
drop policy if exists bphoto_read  on board_photos;
drop policy if exists bphoto_write on board_photos;
create policy bphoto_read on board_photos for select using (true);
create policy bphoto_write on board_photos for all
  using (is_staff() or exists (
    select 1 from board_posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (is_staff() or exists (
    select 1 from board_posts p where p.id = post_id and p.author_id = auth.uid()));

alter table board_comments enable row level security;
drop policy if exists bcomment_read   on board_comments;
drop policy if exists bcomment_insert on board_comments;
drop policy if exists bcomment_modify on board_comments;
create policy bcomment_read on board_comments
  for select using (visibility = 'visible' or author_id = auth.uid() or is_staff());
create policy bcomment_insert on board_comments
  for insert with check (auth.uid() is not null and author_id = auth.uid());
create policy bcomment_modify on board_comments
  for update using (author_id = auth.uid() or is_staff());

-- 게시글 좋아요 — 로그인 1인 1회(본인 행만 조작)
alter table board_likes enable row level security;
drop policy if exists blike_read   on board_likes;
drop policy if exists blike_insert on board_likes;
drop policy if exists blike_delete on board_likes;
create policy blike_read on board_likes for select using (true);
create policy blike_insert on board_likes
  for insert with check (user_id = auth.uid());
create policy blike_delete on board_likes
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. 신대상권 (업체)
-- ---------------------------------------------------------------------
alter table businesses enable row level security;
drop policy if exists biz_read   on businesses;
drop policy if exists biz_insert on businesses;
drop policy if exists biz_modify on businesses;
create policy biz_read on businesses
  for select using (status = 'approved' or owner_id = auth.uid() or is_staff());
create policy biz_insert on businesses
  for insert with check (owner_id = auth.uid());
create policy biz_modify on businesses
  for update using (owner_id = auth.uid() or is_staff());

alter table business_members enable row level security;
drop policy if exists bmem_read  on business_members;
drop policy if exists bmem_write on business_members;
create policy bmem_read on business_members
  for select using (user_id = auth.uid() or owns_business(business_id) or is_staff());
create policy bmem_write on business_members for all
  using (owns_business(business_id) or is_staff())
  with check (owns_business(business_id) or is_staff());

alter table business_photos enable row level security;
drop policy if exists bizphoto_read  on business_photos;
drop policy if exists bizphoto_write on business_photos;
create policy bizphoto_read on business_photos for select using (true);
create policy bizphoto_write on business_photos for all
  using (owns_business(business_id) or is_staff())
  with check (owns_business(business_id) or is_staff());

alter table business_menus enable row level security;
drop policy if exists bizmenu_read  on business_menus;
drop policy if exists bizmenu_write on business_menus;
create policy bizmenu_read on business_menus for select using (true);
create policy bizmenu_write on business_menus for all
  using (owns_business(business_id) or is_staff())
  with check (owns_business(business_id) or is_staff());

-- 홍보글 — 승인+노출만 공개, 작성/수정은 업체 소유자
alter table promo_posts enable row level security;
drop policy if exists promo_read   on promo_posts;
drop policy if exists promo_insert on promo_posts;
drop policy if exists promo_modify on promo_posts;
create policy promo_read on promo_posts
  for select using (
    (status = 'approved' and visibility = 'visible')
    or owns_business(business_id) or is_staff());
create policy promo_insert on promo_posts
  for insert with check (owns_business(business_id));
create policy promo_modify on promo_posts
  for update using (owns_business(business_id) or is_staff());

-- ---------------------------------------------------------------------
-- 10. 지역단체
-- ---------------------------------------------------------------------
alter table organizations enable row level security;
drop policy if exists org_read   on organizations;
drop policy if exists org_insert on organizations;
drop policy if exists org_modify on organizations;
create policy org_read on organizations
  for select using (status = 'approved' or owner_id = auth.uid() or is_staff());
create policy org_insert on organizations
  for insert with check (owner_id = auth.uid());
create policy org_modify on organizations
  for update using (owner_id = auth.uid() or is_staff());

alter table org_photos enable row level security;
drop policy if exists ophoto_read  on org_photos;
drop policy if exists ophoto_write on org_photos;
create policy ophoto_read on org_photos for select using (true);
create policy ophoto_write on org_photos for all
  using (is_org_staff(org_id) or is_staff())
  with check (is_org_staff(org_id) or is_staff());

-- 단체 멤버 — 승인 멤버는 공개(회원목록), 신청정보(pending)는 본인/운영진만
alter table org_members enable row level security;
drop policy if exists omem_read   on org_members;
drop policy if exists omem_insert on org_members;
drop policy if exists omem_modify on org_members;
drop policy if exists omem_delete on org_members;
create policy omem_read on org_members
  for select using (
    status = 'approved' or user_id = auth.uid()
    or is_org_staff(org_id) or is_staff());
create policy omem_insert on org_members
  for insert with check (user_id = auth.uid());            -- 가입 신청(본인)
create policy omem_modify on org_members
  for update using (is_org_staff(org_id) or is_staff());   -- 승인/거절
create policy omem_delete on org_members
  for delete using (
    user_id = auth.uid() or is_org_staff(org_id) or is_staff());

alter table org_posts enable row level security;
drop policy if exists opost_read   on org_posts;
drop policy if exists opost_insert on org_posts;
drop policy if exists opost_modify on org_posts;
create policy opost_read on org_posts
  for select using (visibility = 'visible' or is_org_staff(org_id) or is_staff());
create policy opost_insert on org_posts
  for insert with check (is_org_staff(org_id));
create policy opost_modify on org_posts
  for update using (is_org_staff(org_id) or is_staff());

-- ---------------------------------------------------------------------
-- 11. 광고
-- ---------------------------------------------------------------------
alter table ad_slots enable row level security;
drop policy if exists adslot_read on ad_slots;
create policy adslot_read on ad_slots for select using (true);

alter table ads enable row level security;
drop policy if exists ad_read on ads;
create policy ad_read on ads for select using (is_active or is_staff());

alter table ad_requests enable row level security;
drop policy if exists adreq_insert on ad_requests;
drop policy if exists adreq_read   on ad_requests;
create policy adreq_insert on ad_requests for insert with check (true);
create policy adreq_read   on ad_requests for select using (is_staff());

-- ---------------------------------------------------------------------
-- 12. 즐겨찾기 — 본인만
-- ---------------------------------------------------------------------
alter table favorites enable row level security;
drop policy if exists fav_read   on favorites;
drop policy if exists fav_insert on favorites;
drop policy if exists fav_delete on favorites;
create policy fav_read on favorites for select using (user_id = auth.uid());
create policy fav_insert on favorites for insert with check (user_id = auth.uid());
create policy fav_delete on favorites for delete using (user_id = auth.uid());

-- =====================================================================
-- 끝. 확인: select tablename, rowsecurity from pg_tables
--           where schemaname='public' order by 1;  → 전부 true 여야 함.
-- =====================================================================
