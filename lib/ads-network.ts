// 광고 네트워크(카카오 애드핏) 자리 설정 — 승인 나면 여기만 고치면 켜진다.
//
// 우리가 직접 파는 배너(lib/mock/ads.ts · components/AdSlot.tsx)와는 다른
// 물건이다. 저쪽은 우리 DB에 든 이미지를 우리가 그리고, 이쪽은 카카오가
// 스크립트로 남의 광고를 꽂는다. 한 파일에 섞으면 어느 쪽이 안 나오는지
// 알 수 없게 되므로 갈라 둔다.
//
// ── 승인 후 할 일 ──────────────────────────────────────────────────
// 애드핏에서 광고단위를 만들면 DAN-으로 시작하는 ID가 나온다. 아래 표의
// 빈 문자열 자리에 그 ID를 붙여넣고 배포하면 그 자리부터 광고가 나간다.
// ID가 비어 있는 자리는 점선 상자('광고 영역')로 남는다 — 화면에서 자리를
// 눈으로 확인하기 위한 것이며, 광고가 나가기 시작하면 저절로 사라진다.
//
// ⚠️ 광고단위를 만들 때 아래 size와 같은 크기로 만들어야 한다. 다른 크기로
//    만들면 잡아둔 높이와 어긋나 광고가 뜨는 순간 본문이 밀린다(CLS).

export type NetworkAdSlot = "article-top" | "article-mid" | "article-bottom";

/** 광고단위 크기. 애드핏이 제공하는 규격 중 모바일에서 쓰는 둘만 둔다. */
export type NetworkAdSize = "banner" | "rect";

export const AD_SIZE: Record<NetworkAdSize, { w: number; h: number }> = {
  banner: { w: 320, h: 100 },
  rect: { w: 300, h: 250 },
};

interface UnitConfig {
  /** 애드핏 광고단위 ID(DAN-…). 비어 있으면 자리만 잡고 광고는 부르지 않는다. */
  unit: string;
  size: NetworkAdSize;
}

export const AD_UNITS: Record<NetworkAdSlot, UnitConfig> = {
  // 기사 본문 시작 위 — 첫 화면에 들어오는 자리라 낮은 배너로 둔다.
  "article-top": { unit: "", size: "banner" },
  // 본문 중간(네 문단 뒤) — 가장 오래 머무는 자리. 사각형이 단가가 높다.
  "article-mid": { unit: "", size: "rect" },
  // 본문 끝, 관련 기사 위 — 다 읽고 다음 글로 넘어가기 직전.
  "article-bottom": { unit: "", size: "rect" },
};

/** 켜진 자리가 하나라도 있는지. 스크립트를 부를지 판단하는 데 쓴다. */
export function hasNetworkAds(): boolean {
  return Object.values(AD_UNITS).some((u) => u.unit.trim().length > 0);
}
