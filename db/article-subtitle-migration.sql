-- =====================================================================
--  해룡신문 — 기사 부제(副題)
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  왜: 신문 기사는 주제목만으로 다 담기 어려운 맥락을 부제로 보완한다.
--      목록에서는 주제목만, 상세에서는 주제목 아래 부제를 노출한다.
-- =====================================================================

alter table articles add column if not exists subtitle text;

comment on column articles.subtitle is '부제 — 주제목을 보완하는 한 줄. 없으면 null';

-- 공개 화면이 읽어야 하므로 select 권한 부여.
grant select (subtitle) on articles to anon, authenticated;

-- PostgREST 스키마 캐시 갱신(안 하면 API가 "컬럼 없음"으로 응답할 수 있다).
notify pgrst, 'reload schema';
