import { AD_SIZE, AD_UNITS, type NetworkAdSlot } from "@/lib/ads-network";

// 광고 네트워크(애드핏) 자리 한 칸.
//
// 높이를 미리 잡아 두는 것이 핵심이다. 광고는 페이지가 그려진 뒤에 늦게
// 도착하는데, 그때까지 자리를 비워두지 않으면 광고가 뜨는 순간 읽고 있던
// 본문이 아래로 밀린다. 구글은 그 밀림을 CLS로 재서 검색 순위에 반영한다.
//
// 광고단위 ID가 없는 자리는 아무것도 그리지 않는다. 부르지 않는 광고는
// 화면을 밀 일이 없으니 자리를 비워둘 이유도 없고, 빈 상자만 늘어선 기사는
// 매체 심사에 불리하다.
//
// 스크립트(ba.min.js)는 여기서 부르지 않는다 — app/layout.tsx 가 페이지당
// 한 번만 부른다.
export default function NetworkAd({ slot }: { slot: NetworkAdSlot }) {
  const { unit, size } = AD_UNITS[slot];
  if (!unit.trim()) return null;

  const { w, h } = AD_SIZE[size];

  return (
    <div
      className={`my-7 ${size === "rect" ? "min-h-[276px]" : "min-h-[126px]"}`}
      data-ad={slot}
    >
      {/* 광고임을 밝히는 표시. 신문법은 기사와 광고를 구분해 편집하도록 하고
          있고, 구분은 독자가 알아볼 수 있어야 뜻이 있다 — 그래서 흐릿한
          11px 대신 이 사이트의 작은 글자 기준(15px)을 쓴다. 지우지 말 것. */}
      <span className="mb-1 block text-[15px] tracking-widest text-muted">
        광고
      </span>

      {/* 애드핏이 요구하는 마크업. display:none 은 스크립트가 광고를 채운 뒤
          직접 풀어준다 — 채우기 전에 빈 상자가 깜빡이지 않게 하는 장치다.
          인라인 스타일 대신 같은 뜻의 Tailwind 클래스를 쓴다(프로젝트 규칙).
          스크립트가 넣는 인라인 display:block 이 클래스를 이긴다. */}
      <ins
        className="kakao_ad_area hidden"
        data-ad-unit={unit}
        data-ad-width={String(w)}
        data-ad-height={String(h)}
      />
    </div>
  );
}
