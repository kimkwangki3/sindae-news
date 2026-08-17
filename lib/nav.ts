// 하단 탭 / 카테고리 네비게이션 정의 (라우트 ↔ 시안 매핑)

import { FEATURES } from "./features";

export interface BottomTab {
  href: string;
  label: string;
  icon: string; // 임시 이모지(추후 아이콘 컴포넌트로 교체)
}

// 나눔마켓 노출 여부는 lib/features.ts의 FEATURES.market 하나로 제어한다.
//
// 라벨은 세 글자까지만 쓴다. 탭 하나에 돌아오는 폭은 360px ÷ 6 = 60px 남짓인데
// 네 글자를 굵게 쓰면 그보다 넓어진다. 한글은 글자 사이 어디서나 줄이 바뀔 수
// 있어서, 넘치는 대신 조용히 두 줄이 되어 탭바 높이가 들썩였다.
// 여기에 탭을 더하거나 라벨을 늘릴 생각이라면 그 계산부터 다시 해야 한다.
export const BOTTOM_TABS: BottomTab[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/articles", label: "기사", icon: "📰" },
  { href: "/district", label: "상권", icon: "🏪" },
  { href: "/orgs", label: "단체", icon: "🏛️" },
  ...(FEATURES.market ? [{ href: "/market", label: "나눔", icon: "🤝" }] : []),
  { href: "/board", label: "게시판", icon: "💬" },
  { href: "/surveys", label: "의견", icon: "📊" },
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
