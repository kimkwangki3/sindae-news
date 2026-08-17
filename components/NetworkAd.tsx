import Script from "next/script";
import { AD_SIZE, AD_UNITS, type NetworkAdSlot } from "@/lib/ads-network";

// 광고 네트워크(애드핏) 자리 한 칸.
//
// 핵심은 '높이를 미리 잡아 두는 것'이다. 광고는 페이지가 그려진 뒤에 늦게
// 도착하는데, 그때까지 자리를 비워두지 않으면 광고가 뜨는 순간 읽고 있던
// 본문이 아래로 밀린다. 구글은 그 밀림을 CLS로 재서 검색 순위에 반영한다.
// 그래서 광고가 아직 없을 때도(승인 전에도) 같은 높이를 차지한다.
//
// 광고단위 ID를 넣기 전에는 점선 상자만 보인다. 자리를 눈으로 확인하기
// 위한 것이며, lib/ads-network.ts 에 ID를 넣는 순간 진짜 광고로 바뀐다.
export default function NetworkAd({ slot }: { slot: NetworkAdSlot }) {
  const { unit, size } = AD_UNITS[slot];
  const { w, h } = AD_SIZE[size];
  const ready = unit.trim().length > 0;

  return (
    // 높이는 두 상태가 같아야 한다. 여기가 어긋나면 광고를 켜는 날 본문이
    // 통째로 밀리고, 그건 승인 직후에 순위가 떨어지는 모습으로 나타난다.
    <div
      className={`my-7 ${size === "rect" ? "min-h-[266px]" : "min-h-[116px]"}`}
      data-ad={slot}
    >
      {/* 광고임을 밝히는 표시. 표시광고법상 기사와 광고는 구분되어야 하고,
          독자가 알아볼 수 있어야 한다 — 그래서 흐릿한 11px 대신 이 사이트의
          작은 글자 기준(15px)을 쓴다. 자체 배너의 '광고' 뱃지와 같은 뜻이다. */}
      <span className="mb-1 block text-[15px] tracking-widest text-muted">
        광고
      </span>

      {ready ? (
        <>
          {/* 애드핏이 요구하는 마크업 그대로. 스크립트가 채우기 전에는 감춰
              두어야 빈 상자가 깜빡이지 않는다(스크립트가 직접 펼친다). */}
          <ins
            className="kakao_ad_area hidden"
            data-ad-unit={unit}
            data-ad-width={String(w)}
            data-ad-height={String(h)}
          />
          {/* 같은 주소는 next/script 가 한 번만 내려받는다 — 자리가 셋이어도
              스크립트는 하나다. */}
          <Script
            id="kakao-adfit"
            src="https://t1.daumcdn.net/kas/static/ba.min.js"
            strategy="afterInteractive"
          />
        </>
      ) : (
        // 승인 전 자리표시. 광고가 켜지면 이 가지는 아예 그려지지 않는다.
        <div
          className={`flex items-center justify-center rounded-element border border-dashed border-line text-[15px] text-muted ${
            size === "rect" ? "h-[250px]" : "h-[100px]"
          }`}
        >
          광고 영역 {w}×{h}
        </div>
      )}
    </div>
  );
}
