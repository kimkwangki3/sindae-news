// 하단 탭 / 카테고리 네비게이션 정의 (라우트 ↔ 시안 매핑)

export interface BottomTab {
  href: string;
  label: string;
  icon: string; // 임시 이모지(추후 아이콘 컴포넌트로 교체)
}

// 나눔마켓은 발행인 요청으로 탭에서 제외(2026-07-31). /market 라우트는 살아 있어
// 직접 주소로는 접근 가능하다. 다시 열려면 아래 한 줄을 되살리면 된다.
//   { href: "/market", label: "나눔마켓", icon: "🤝" },
export const BOTTOM_TABS: BottomTab[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/articles", label: "기사", icon: "📰" },
  { href: "/district", label: "상권", icon: "🏪" },
  { href: "/orgs", label: "지역단체", icon: "🏛️" },
  { href: "/board", label: "게시판", icon: "💬" },
];

export interface CategoryLink {
  href: string;
  label: string;
}

// 상단 카테고리 바 (홈 + 핫소식 + 기사 카테고리). 지역단체는 하단 탭으로 분리됨.
export const CATEGORY_LINKS: CategoryLink[] = [
  { href: "/", label: "홈" },
  { href: "/hot", label: "🔥핫소식" },
  { href: "/articles/local", label: "지역소식" },
  { href: "/articles/admin", label: "행정" },
  { href: "/articles/people", label: "인물" },
  { href: "/articles/life", label: "생활" },
];
