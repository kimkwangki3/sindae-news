-- =====================================================================
--  해룡신문 — 첫 화면 헤드라인 편성표
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  톱 1건 + 서브 3건을 편집인이 고른다. 행이 없는 칸은 최신 기사로 자동으로
--  채워지므로(lib/frontpage.ts), 이 표가 비어 있어도 첫 화면은 그대로 나온다.
--  기사를 지우면 편성도 함께 지워진다.
-- =====================================================================

create table if not exists front_page_slots (
  slot         text primary key
               check (slot in ('top', 'sub1', 'sub2', 'sub3')),
  article_id   uuid not null references articles(id) on delete cascade,
  short_title  text check (char_length(short_title) <= 80),  -- 톱 전용 짧은 제목
  pinned       boolean not null default false,               -- 자동 복귀 없이 고정
  expires_at   timestamptz,                                  -- 지나면 자동으로 내려간다
  set_by       uuid references profiles(id),                 -- 텔레그램 지정은 null
  set_at       timestamptz not null default now()
);

comment on table front_page_slots is
  '첫 화면 헤드라인 편성. 빈 칸은 최신 기사로 자동으로 채운다.';

-- 읽기는 누구나(첫 화면을 그려야 한다). 쓰기 정책은 두지 않는다 —
-- 관리자 화면과 텔레그램 webhook은 service role로만 쓴다.
alter table front_page_slots enable row level security;
drop policy if exists front_slot_read on front_page_slots;
create policy front_slot_read on front_page_slots for select using (true);

notify pgrst, 'reload schema';

-- 확인용 (0건이 나오면 정상)
--   select * from front_page_slots;
