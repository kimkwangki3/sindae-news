-- =====================================================================
--  해룡신문 — 게시판 본문 블록(사진 중간 삽입 + 문단 색상)
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--  기사쪽(article-blocks-migration.sql)을 먼저 적용한 뒤 실행한다.
--
--  왜 필요한가
--   * 지금은 본문 아래에 사진이 한 줄로 모여 붙는다. "이 문단 다음에 이 사진"을
--     담을 자리가 없어서, 사진 여러 장을 올려도 글과 따로 논다.
--
--  설계 — 기사와 완전히 같은 구조를 쓴다
--   * body(text)는 계속 채운다(블록에서 글자만 뽑아서). 알림·검색처럼 순수
--     텍스트가 필요한 곳이 조용히 깨지지 않게 하는 폴백이다.
--   * body_format이 'text'인 기존 글은 예전 경로 그대로 렌더된다.
--     이 마이그레이션만 적용해서는 화면이 달라지지 않는다.
--   * 본문에 넣은 사진은 board_photos에도 계속 기록한다. 사진이 본문 안에만
--     있으면 나중에 목록 썸네일이나 관리자 점검에서 찾을 길이 없어진다.
--     대신 블록 글은 본문 아래 갤러리를 숨겨 같은 사진이 두 번 나오지 않게 한다.
--
--  권한 메모
--   * board_posts는 profiles와 달리 테이블 단위 권한을 그대로 쓴다(민감 컬럼
--     차단 대상이 아니다). 그래서 새 컬럼도 기존 insert/update 권한에 자동
--     포함되고, 접근 제어는 RLS 정책(bpost_insert/bpost_modify)이 계속 맡는다.
-- =====================================================================

alter table board_posts add column if not exists body_blocks jsonb;
alter table board_posts add column if not exists body_format text not null default 'text';

comment on column board_posts.body_blocks is
  '본문 블록 배열(jsonb). body_format=''blocks''일 때만 사용. 색은 색 이름만 저장하고 CSS는 저장하지 않는다(XSS 차단)';
comment on column board_posts.body_format is
  '''text'' = 기존 방식(body 컬럼을 줄바꿈 그대로 렌더), ''blocks'' = body_blocks 사용';

-- 허용값 밖의 값이 들어오면 렌더 분기가 조용히 빗나간다. DB에서 먼저 막는다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'board_posts_body_format_chk'
  ) then
    alter table board_posts
      add constraint board_posts_body_format_chk
      check (body_format in ('text', 'blocks'));
  end if;
end $$;

grant select (body_blocks, body_format) on board_posts to anon, authenticated;

-- PostgREST 스키마 캐시 갱신(안 하면 API가 "컬럼 없음"으로 응답할 수 있다).
notify pgrst, 'reload schema';
