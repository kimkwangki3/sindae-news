-- =====================================================================
--  해룡신문 — 기사 부가정보: AI 생성 고지 + 출처 표기
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  왜 필요한가
--   * ai_text / ai_image
--     생성형 AI로 만든 본문·이미지를 표시 없이 내보내면 독자 신뢰를 잃고,
--     포털 제휴 심사나 언론중재 분쟁에서 불리하게 작용할 수 있다.
--   * source_url / source_name
--     보도자료·공공자료를 재구성한 기사는 출처를 밝혀야 한다.
--     자체 취재 기사는 비워 두면 되고, 값이 있을 때만 화면에 노출된다.
-- =====================================================================

alter table articles add column if not exists ai_text     boolean not null default false;
alter table articles add column if not exists ai_image    boolean not null default false;
alter table articles add column if not exists source_url  text;
alter table articles add column if not exists source_name text;

comment on column articles.ai_text     is 'AI 도구로 본문을 작성·생성했는지 (고지 표기용)';
comment on column articles.ai_image    is '대표 이미지를 AI로 생성했는지 (고지 표기용)';
comment on column articles.source_url  is '원문 자료 링크(보도자료·공공자료). 자체 취재는 null';
comment on column articles.source_name is '출처 기관·매체명. 예: 순천시청 보도자료';

-- 공개 화면이 읽어야 하므로 anon/authenticated에 select 권한 부여.
-- (profiles 사례처럼 나중에 컬럼 권한을 조이더라도 이 넷은 공개 대상임을 명시)
grant select (ai_text, ai_image, source_url, source_name) on articles to anon, authenticated;
