-- =====================================================================
--  해룡신문 — 기사 본문 블록(사진 중간 삽입 + 문단 강조색)
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  왜 필요한가
--   * 지금 기사 본문은 text 한 덩어리고, 사진은 대표 이미지(thumbnail_url)
--     한 장뿐이다. 행사 사진 여러 장을 문단 사이사이에 넣은 기사를 쓸 방법이
--     아예 없었다. 신문에서 사진은 본문의 일부인데 구조가 이를 담지 못했다.
--
--  설계 — 기존 body는 그대로 둔다
--   * body(text)는 앞으로도 계속 채운다. 블록에서 글자만 뽑아 넣는다.
--     목록 요약·공유 미리보기 설명·검색이 이 컬럼을 읽고 있어서, 여기를
--     비우면 블록과 무관한 화면들이 조용히 깨진다.
--   * body_blocks(jsonb)에 문단/사진/소제목/인용/구분선을 순서대로 담는다.
--   * body_format이 'text'인 기존 기사는 예전 코드 경로 그대로 렌더된다.
--     즉 이 마이그레이션만 적용해도 화면은 아무것도 달라지지 않는다.
--     되돌릴 때도 컬럼을 지울 필요 없이 화면 코드만 원복하면 된다.
--
--  블록 형태(애플리케이션이 저장 전에 화이트리스트로 재구성한다)
--   [{"type":"text","text":"...","color":"ink","style":"normal"},
--    {"type":"image","url":"https://….supabase.co/storage/v1/object/public/…",
--     "caption":"…"},
--    {"type":"divider"}]
-- =====================================================================

alter table articles add column if not exists body_blocks jsonb;
alter table articles add column if not exists body_format text not null default 'text';

comment on column articles.body_blocks is
  '본문 블록 배열(jsonb). body_format=''blocks''일 때만 사용. 색은 색 이름만 저장하고 CSS는 저장하지 않는다(XSS 차단)';
comment on column articles.body_format is
  '''text'' = 기존 방식(body 컬럼을 문단으로 쪼개 렌더), ''blocks'' = body_blocks 사용';

-- 허용값 밖의 값이 들어오면 렌더 분기가 조용히 빗나간다. DB에서 먼저 막는다.
-- (add constraint 에는 if not exists 가 없어서 존재 확인 후 추가)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'articles_body_format_chk'
  ) then
    alter table articles
      add constraint articles_body_format_chk
      check (body_format in ('text', 'blocks'));
  end if;
end $$;

-- 공개 화면이 읽어야 하므로 anon/authenticated에 select 권한 부여.
-- (기존 태그 마이그레이션과 같은 방식 — 컬럼 단위 grant는 기존 권한에 더해진다)
grant select (body_blocks, body_format) on articles to anon, authenticated;

-- PostgREST 스키마 캐시 갱신(안 하면 API가 "컬럼 없음"으로 응답할 수 있다).
notify pgrst, 'reload schema';
