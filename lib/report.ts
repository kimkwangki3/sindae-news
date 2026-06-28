// 통합 신고 — 모든 콘텐츠가 같은 사유/방식으로 신고된다(schema reports.target_type).
export type ReportTarget =
  | "article"
  | "comment"
  | "business"
  | "organization"
  | "market_post"
  | "org_post"
  | "promo_post"
  | "board_post"
  | "board_comment";

export const REPORT_TARGET_LABEL: Partial<Record<ReportTarget, string>> = {
  article: "기사",
  comment: "댓글",
  market_post: "나눔글",
  board_post: "게시글",
  board_comment: "댓글",
  business: "업체",
  organization: "지역단체",
};

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "abuse", label: "욕설 · 비방 · 혐오" },
  { value: "fake", label: "허위사실 · 가짜뉴스" },
  { value: "spam", label: "광고 · 스팸 · 도배" },
  { value: "obscene", label: "음란 · 부적절한 내용" },
  { value: "privacy", label: "개인정보 노출" },
  { value: "copyright", label: "저작권 침해" },
  { value: "etc", label: "기타" },
];
