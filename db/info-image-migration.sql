-- =====================================================================
--  생활정보에 대표 이미지 칸 추가
--
--  Supabase SQL Editor에 붙여넣고 실행. 재실행 안전.
--
--  재활용 요일표처럼 한 장으로 정리된 그림은 카카오톡 단톡방에서 계속
--  돌아다닌다. 글만으로는 퍼가기 어렵다.
-- =====================================================================

alter table info_pages add column if not exists image_url text;

comment on column info_pages.image_url is
  '대표 이미지. 본문 맨 위에 표시된다. 요일표처럼 공유하기 좋은 그림을 넣는다.';

notify pgrst, 'reload schema';
