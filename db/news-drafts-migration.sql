-- =====================================================================
--  해룡신문 — 기사 초안(자동 생성) 저장소
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전(if not exists).
--
--  흐름: 수집·집필이 초안을 여기에 적재 → 텔레그램으로 승인 요청 →
--        발행인이 [발행] 누르면 articles로 옮겨 게재.
--        승인 없이는 한 건도 자동으로 올라가지 않는다.
--
--  이미지는 자동 생성하지 않는다(발행인 결정). 초안에 image_prompt만 담아
--  발행인이 외부에서 만들어 올린다.
-- =====================================================================

create table if not exists news_drafts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  subtitle      text,
  body          text,
  category_slug text not null default 'local',   -- local/admin/people/life
  source_name   text,                            -- 예: 순천시청 보도자료
  source_url    text,
  scope         text,                            -- 신대지구 / 해룡면 / 순천시
  needs_check   text,                            -- 확인이 필요한 사실관계 메모
  image_prompt  text,                            -- 대표 이미지용 프롬프트(수동 생성용)
  status        text not null default 'pending', -- pending/published/discarded
  tg_message_id bigint,                          -- 승인 버튼이 달린 텔레그램 메시지
  published_slug text,                           -- 발행됐다면 그 기사 슬러그
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);

create index if not exists news_drafts_status_idx
  on news_drafts (status, created_at desc);

comment on table  news_drafts             is '자동 생성 기사 초안. 발행인 승인 후에만 articles로 게재된다';
comment on column news_drafts.needs_check is '사실관계가 불확실해 확인이 필요한 부분. 있으면 승인 전 전화 확인';

-- RLS: 정책을 만들지 않아 anon/authenticated는 전혀 접근하지 못한다.
-- 초안 적재와 발행은 service role(서버 전용)로만 이뤄진다.
alter table news_drafts enable row level security;

notify pgrst, 'reload schema';
