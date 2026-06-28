// Phase 1 골격용 조회/읽음 집계 목 구현. Phase 2에서 Supabase(article_views)로 교체.
// 교체 시 trackArticleView 시그니처만 유지하면 됨:
//   insert into article_views(article_id, ip_hash, scroll_pct, dwell_ms, ...).

export interface ArticleViewEvent {
  slug: string;
  scrollPct: number; // 0~100, 최대 스크롤 도달 비율(읽음률)
  dwellMs: number; // 체류 시간(ms)
}

// 진입 시 1회(조회수) + 이탈 시 1회(읽음률/체류) 기록 용도.
// Phase 1: 서버 콘솔에만 남기고 무시. Phase 2: article_views insert + IP 해시.
export function recordArticleView(ev: ArticleViewEvent): void {
  // 목 단계에서는 집계 저장소가 없으므로 관찰만 한다(소음 방지 위해 개발 환경에서만).
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[view] ${ev.slug} · scroll ${ev.scrollPct}% · dwell ${ev.dwellMs}ms`,
    );
  }
}
