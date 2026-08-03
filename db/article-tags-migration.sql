-- =====================================================================
--  해룡신문 — 기사 태그(#키워드)
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  왜 필요한가
--   * 분류(category)는 4개뿐이라 "선암사", "폭염", "청년"처럼 기사를 가로지르는
--     주제를 담지 못한다. 태그는 카테고리를 건너뛰어 같은 화제의 기사를 묶는다.
--   * 지역신문은 같은 사안을 여러 번 나눠 보도한다. 태그가 있으면 독자가
--     "이 이야기의 앞뒤"를 한 화면에서 따라갈 수 있고, 검색엔진에도
--     주제별 묶음 페이지(/tag/…)가 생겨 유입 경로가 늘어난다.
--
--  설계
--   * 별도 테이블 대신 text[] 한 컬럼. 태그에 붙는 속성(설명·대표이미지)이
--     아직 없고, 기사 수도 작다. 조인 없이 읽히는 편이 단순하다.
--     태그별 소개글이나 구독 기능이 생기면 그때 tags 테이블로 승격한다.
--   * 값은 '#' 없이 저장한다. 화면에서만 # 을 붙인다.
-- =====================================================================

alter table articles add column if not exists tags text[] not null default '{}';

comment on column articles.tags is
  '기사 태그 목록. # 없이 저장(예: {"선암사","청년","폭염"}). 최대 8개 권장';

-- 태그 페이지(/tag/…)는 "이 태그를 포함하는 기사"를 찾는다 = 배열 포함 연산(@>).
-- GIN 인덱스가 없으면 기사 수가 늘수록 전체 스캔이 된다.
create index if not exists articles_tags_idx on articles using gin (tags);

-- 공개 화면이 읽어야 하므로 anon/authenticated에 select 권한 부여.
grant select (tags) on articles to anon, authenticated;

-- PostgREST 스키마 캐시 갱신(안 하면 API가 "컬럼 없음"으로 응답할 수 있다).
notify pgrst, 'reload schema';
