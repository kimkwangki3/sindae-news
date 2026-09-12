-- =====================================================================
--  해룡신문 — 초안 대표 이미지
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  ⚠️ 순서: 이 SQL을 먼저 실행하고 나서 코드를 배포한다.
--     기사 상세와 텔레그램 발행이 image_credit / image_url 을 읽는다.
--     컬럼이 없으면 기사 페이지가 404가 되고 [발행] 버튼이 멈춘다.
--
--  흐름: 초안을 만들 때 대표 이미지를 함께 마련해 Storage(articles 버킷의
--        drafts/)에 올리고, 텔레그램에 그림과 함께 보낸다. 발행인이
--        [발행]을 누르면 그 그림이 기사 대표 이미지가 된다.
--    · 순천시청 자료 — 보도자료에 첨부된 사진(공공누리 제4유형, 출처 표시)
--    · 전국 이슈     — AI 생성. 그림 안에 "AI 생성 이미지"를 새긴다
--    · 사건사고      — 붙이지 않는다
-- =====================================================================

alter table news_drafts add column if not exists image_url    text;
alter table news_drafts add column if not exists image_credit text;
alter table news_drafts add column if not exists image_ai     boolean not null default false;

comment on column news_drafts.image_url    is '초안에 붙인 대표 이미지(Storage 공개 주소). 없으면 null';
comment on column news_drafts.image_credit is '대표 이미지 출처 표기. 예: 사진: 순천시 제공(공공누리 제4유형)';
comment on column news_drafts.image_ai     is '대표 이미지를 AI로 생성했는지 — 발행 때 articles.ai_image로 옮겨진다';

-- 기사 쪽 사진 출처. 대표 사진이 남의 저작물일 때 사진 바로 아래에 밝힌다.
-- 자체 촬영·AI 생성이면 null.
alter table articles add column if not exists image_credit text;
comment on column articles.image_credit is '대표 사진 출처(남의 저작물일 때). 자체 촬영·AI 생성은 null';

-- 공개 화면이 읽어야 한다(article-meta-migration.sql 과 같은 이유).
grant select (image_credit) on articles to anon, authenticated;

notify pgrst, 'reload schema';
