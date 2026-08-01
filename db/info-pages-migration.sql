-- =====================================================================
--  생활정보 — info_pages
--
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  기사가 아니라 계속 갱신되는 정보다. 버스 시간표, 야간 약국, 재활용
--  배출 요일처럼 주민이 필요할 때 찾아오는 것들.
--
--  게시판 고정글로 만들지 않은 이유: 표를 만들 수 없고, 자동 갱신이 글
--  수정으로 들어가 이력이 지저분해지며, 게시판 상단을 여러 칸 차지해
--  주민 글이 밀린다. 전용 페이지로 두고 게시판에는 바로가기만 고정한다.
-- =====================================================================

create table if not exists info_pages (
  slug         text primary key,
  title        text not null,
  summary      text,                       -- 목록 카드에 보일 한 줄
  icon         text,                       -- 카드 아이콘(이모지)
  body         text,                       -- 본문(빈 줄로 문단 구분)
  -- 자동 갱신분이 표 형태 자료를 담을 자리. 2단계(병원·약국)부터 쓴다.
  -- 지금 만들어 두면 나중에 마이그레이션을 다시 돌리지 않아도 된다.
  data         jsonb,
  source_name  text,                       -- 출처 표기(정확성 책임)
  source_url   text,
  auto_updated boolean not null default false,  -- 자동 갱신 대상인가
  is_published boolean not null default false,  -- 내용을 채우기 전에는 공개하지 않는다
  sort         integer not null default 0,
  updated_at   timestamptz not null default now()
);

create index if not exists info_pages_pub_sort_idx
  on info_pages (is_published, sort);

comment on table info_pages is
  '생활정보. 기사와 달리 계속 갱신된다. 내용을 채우고 is_published를 켜야 공개된다.';

-- 공개 읽기(공개 상태인 것만) / 쓰기는 service_role(관리자)만.
alter table info_pages enable row level security;
drop policy if exists info_read on info_pages;
create policy info_read on info_pages for select using (is_published);

-- 6개 항목의 자리를 만들어 둔다. 본문은 비어 있고 공개도 꺼져 있다 —
-- 실제 내용(단지별 배출 요일 같은 것)은 지어낼 수 없으므로 발행인이
-- /admin/info 에서 채운 뒤 공개로 바꾼다.
insert into info_pages (slug, title, summary, icon, source_name, auto_updated, sort) values
  ('bus',       '해룡면 버스 노선·시간표', '신대·복성·선월지구 경유 노선과 배차', '🚌', '순천시 버스정보',        true,  10),
  ('recycle',   '단지별 재활용 배출 요일',  '우리 아파트는 무슨 요일에 내놓나',    '♻️', '해룡면 행정복지센터·관리사무소', false, 20),
  ('medical',   '야간·휴일 진료 병원·약국', '지금 문 연 곳을 바로 확인',          '🏥', '국립중앙의료원',          true,  30),
  ('childcare', '어린이집·유치원 현황',     '해룡면 시설 목록과 문의처',          '🧸', '어린이집정보·유치원알리미', true,  40),
  ('academy',   '신대지구 학원가',          '과목별 학원·교습소 목록',            '📚', '전남교육청 학원알리미',    true,  50),
  ('civil',     '주민센터 민원 안내',       '무엇을 어디서, 무엇을 챙겨 가나',     '🏛️', '순천시·해룡면 행정복지센터', false, 60)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
