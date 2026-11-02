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
  { href: "/info", label: "생활정보" },
];

// 실시간 공공데이터로 만드는 생활정보. 고정 안내(info_pages)보다 앞에 둔다.
export const LIVE_INFO_PAGES = [
  { slug: "pharmacy", icon: "💊", title: "해룡면 약국 영업시간", summary: "지금 영업시간 안인 곳과 전화번호" },
  { slug: "hospital", icon: "🏥", title: "병원·의원 진료시간", summary: "의원·치과·한의원 종별 안내" },
  { slug: "emergency", icon: "🚑", title: "순천 응급실", summary: "위치·전화번호·병상 현황" },
  { slug: "weather", icon: "🌤️", title: "해룡면 날씨", summary: "시간별 예보와 신대 미세먼지" },
];

// PC판 메뉴의 둘째 묶음. 휴대폰에서 하단 탭이 맡는 자리들이다.
export const DESKTOP_LINKS: CategoryLink[] = [
  { href: "/info", label: "생활정보" },
  { href: "/haeryong", label: "동네 안내" },
  { href: "/district", label: "상권" },
  { href: "/orgs", label: "단체" },
  { href: "/board", label: "게시판" },
  { href: "/surveys", label: "주민 의견" },
];
