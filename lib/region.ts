// 거주 지역 선택지 — 한 곳에서만 관리한다.
// 온보딩·기자모집·단체가입·나눔글쓰기가 같은 목록을 써야 통계가 맞는다.
//
// 행정 체계: 순천시 해룡면 아래 신대지구·복성지구·선월지구.
// '해룡면 그 외'는 세 지구에 속하지 않는 해룡면 마을,
// '그 외 지역'은 해룡면 밖(순천 타 지역·타지)이다.

export const REGIONS = [
  "신대지구",
  "복성지구",
  "선월지구",
  "해룡면 그 외",
  "그 외 지역",
] as const;

export type Region = (typeof REGIONS)[number];

export function isRegion(v: string): v is Region {
  return (REGIONS as readonly string[]).includes(v);
}

// 해룡면 주민인지 — 보급 대상 지역 통계에 쓴다.
export function isHaeryongResident(v: string | null): boolean {
  return Boolean(v && v !== "그 외 지역" && isRegion(v));
}
