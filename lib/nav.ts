// 하단 탭 / 카테고리 네비게이션 정의 (라우트 ↔ 시안 매핑)

import { FEATURES } from "./features";

export interface BottomTab {
  href: string;
  label: string;
  icon: string; // 임시 이모지(추후 아이콘 컴포넌트로 교체)
}

// 나눔마켓 노출 여부는 lib/features.ts의 FEATURES.market 하나로 제어한다.
export const BOTTOM_TABS: BottomTab[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/articles", label: "기사", icon: "📰" },
  { href: "/district", label: "상권", icon: "🏪" },
  { href: "/orgs", label: "지역단체", icon: "🏛️" },
  ...(FEATURES.market
    ? [{ href: "/market", label: "나눔마켓", icon: "🤝" }]
    : []),
  { href: "/board", label: "게시판", icon: "💬" },
  // 탭이 여섯이 됐다. 360px에서 라벨 최소폭 합이 약 313px이라 들어간다
  // (탭은 flex-1 이지만 글자보다 좁아지지는 않는다). 여기서 더 늘리려면
  // '지역단체'처럼 네 글자짜리 라벨부터 줄여야 한다.
  { href: "/surveys", label: "설문조사", icon: "📊" },
];

export interface CategoryLink {
  href: string;
  label: string;
}

// 상단 카테고리 바 (홈 + 기사 카테고리). 지역단체는 하단 탭으로 분리됨.
// 핫소식은 발행인 판단으로 상단에서 내렸다(2026-08-01). /hot 페이지 자체는
// 남아 있어 기존 링크는 그대로 열린다.
export const CATEGORY_LINKS: CategoryLink[] = [
  { href: "/", label: "홈" },
  { href: "/articles/local", label: "해룡소식" },
  { href: "/articles/people", label: "해룡인물" },
  { href: "/articles/admin", label: "행정" },
  { href: "/articles/life", label: "생활" },
];
