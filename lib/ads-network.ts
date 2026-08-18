// 광고 네트워크(카카오 애드핏) 자리 설정 — 승인 나면 여기만 고치면 켜진다.
//
// 우리가 직접 파는 배너(lib/mock/ads.ts · components/AdSlot.tsx)와는 다른
// 물건이다. 저쪽은 우리 DB에 든 이미지를 우리가 그리고, 이쪽은 카카오가
// 스크립트로 남의 광고를 꽂는다. 한 파일에 섞으면 어느 쪽이 안 나오는지
// 알 수 없게 되므로 갈라 둔다.
//
// ── 자리를 켜는 법 ─────────────────────────────────────────────────
// 애드핏에서 광고단위를 만들면 DAN-으로 시작하는 ID가 나온다. 아래 표의
// 빈 문자열 자리에 그 ID를 넣고 배포하면 그 자리부터 광고가 나간다.
// ID가 없는 자리는 아무것도 그리지 않는다 — 빈 상자를 띄워 두면 매체 심사에
// 불리하고, 광고를 부르지 않는 자리는 어차피 화면을 밀 일도 없다.
//
// ⚠️ 광고단위를 만들 때 아래 size와 같은 크기로 만들어야 한다. 다른 크기로
//    만들면 잡아둔 높이와 어긋나 광고가 뜨는 순간 본문이 밀린다(CLS).
//
// ⚠️ 728×90 은 쓰지 않는다. 데스크톱에서도 본문 컬럼이 480px 고정이라
//    들어가지 않는다(2026-08-17 실측). 받아둔 DAN-6G939VHm5d3BTC0O 도
//    같은 이유로 코드에 넣지 않는다.

export type NetworkAdSlot =
  | "article-top"
  | "article-mid"
  | "article-bottom"
  // 목록 화면의 자리. 기사 상세에만 광고가 있으면 첫 화면부터 보는 심사자
  // 눈에는 '설치 안 됨'으로 보인다(2026-08-18 매체 심사 보류 사유).
  | "home-list"
  | "articles-list";

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
  // 기사 본문 시작 위 — 320×100 광고단위를 만든 뒤에 켠다(매체 심사 통과 후).
  "article-top": { unit: "", size: "banner" },
  // 본문 중간(네 칸 뒤) — 가장 오래 머무는 자리. 지금 있는 단위는 이것뿐이다.
  // 광고단위명 '기사중간_공용', 300×250.
  //
  // ID는 HTML 소스에 그대로 나가는 공개값이라 감출 이유가 없다. 그래서 코드에
  // 적어 둔다 — 배포 환경 설정을 빠뜨려 광고가 안 나가는 사고를 막는 편이
  // 낫다. 나중에 단위를 갈아끼울 때는 환경변수로 덮어쓸 수 있다.
  "article-mid": {
    unit:
      process.env.NEXT_PUBLIC_ADFIT_ARTICLE_MID ?? "DAN-SVXcSkCzKiRGY928",
    size: "rect",
  },
  // 본문 끝, 관련 기사 위 — 단위를 더 만들면 켠다. 지금은 비워 둔다.
  // 한 기사에 광고가 여럿이면 심사에서 좋게 보지 않는다.
  //
  // 짧은 기사의 '본문 끝' 광고는 이 자리가 아니다. 그쪽은 article-mid 한 칸을
  // 본문 마지막으로 옮겨 놓는 것이라(PostBody.planMidAd), 기사당 광고는 어느
  // 경우에도 하나다.
  "article-bottom": { unit: "", size: "rect" },

  // 목록 화면 — 같은 광고단위를 함께 쓴다. 한 단위를 여러 화면에서 부르는
  // 것은 애드핏에서 정상이고, 한 화면 안에 같은 단위가 둘 뜨는 일만 없으면
  // 된다(그래서 목록마다 자리는 하나씩만 둔다).
  "home-list": {
    unit: process.env.NEXT_PUBLIC_ADFIT_ARTICLE_MID ?? "DAN-SVXcSkCzKiRGY928",
    size: "rect",
  },
  "articles-list": {
    unit: process.env.NEXT_PUBLIC_ADFIT_ARTICLE_MID ?? "DAN-SVXcSkCzKiRGY928",
    size: "rect",
  },
};

/** 켜진 자리가 하나라도 있는지. 스크립트를 부를지 판단하는 데 쓴다. */
export function hasNetworkAds(): boolean {
  return Object.values(AD_UNITS).some((u) => u.unit.trim().length > 0);
}

/**
 * 애드핏 로더. 페이지당 한 번만 부른다(app/layout.tsx).
 *
 * ins 태그마다 스크립트를 붙이면 같은 파일이 여러 번 실행된다. 심사
 * 체크리스트가 '페이지당 1회'를 못 박고 있다.
 */
export const ADFIT_SCRIPT = "https://t1.kakaocdn.net/kas/static/ba.min.js";
