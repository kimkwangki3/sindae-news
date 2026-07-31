// 기사 조회/읽음 이벤트 타입.
// 클라이언트(ReadTracker)가 측정해 서버 액션 trackArticleView로 넘긴다.
// 실제 적재는 app/(public)/articles/actions.ts에서 article_views에 한다.

export interface ArticleViewEvent {
  slug: string;
  scrollPct: number; // 0~100, 최대 스크롤 도달 비율(읽음률)
  dwellMs: number; // 체류 시간(ms)
}
