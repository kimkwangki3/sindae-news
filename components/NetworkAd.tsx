"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
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
// 한 번만 부른다. 아래에서 하는 일은 이미 와 있는 스크립트에게 "이 자리도
// 채워달라"고 말을 거는 것뿐이다.

// 애드핏 로더가 window 에 심어 두는 조종간. 스크립트가 아직 도착하지 않았으면
// 없다 — 그래서 있는지 보고 부른다.
declare global {
  interface Window {
    adfit?: { render?: (el: HTMLElement) => void };
  }
}

// 이 페이지를 연 뒤로 사이트 안에서 화면을 옮긴 적이 있는지.
//
// 페이지를 새로 열면 로더가 실행되면서 화면을 한 번 훑어 그때 있던 자리를
// 전부 채운다. 그러니 첫 화면의 자리는 우리가 건드릴 일이 없다 — 오히려
// 건드리면 안 된다. 애드핏은 이미 채운 자리에 render 를 다시 부르면 광고를
// 새것으로 갈아끼우기 때문이다(내부의 shouldRefreshOnDuplicate 가 우리처럼
// data-ad-preload 를 안 쓰는 자리에 대해 참을 낸다). 한 번 볼 광고를 두 번
// 부르는 셈이라 심사에서도, 집계에서도 좋을 것이 없다.
//
// 반면 링크를 눌러 다른 화면으로 넘어가면(클라이언트 라우팅) 로더는 이미 제
// 할 일을 끝낸 뒤다. 새로 생긴 ins 는 아무도 보지 않아 빈 칸으로 남는다.
// 실제로 그렇게 깨지는 것을 확인했다(2026-08-18). 그때부터는 우리가 직접
// 부른다. 로더가 700ms마다 도는 preload 는 data-ad-preload="Y" 를 단 자리만
// 훑으므로 우리 자리는 그 그물에 걸리지 않는다.
//
// 모듈 변수라 페이지를 새로 열면 다시 false 부터 시작한다.
let routeChanged = false;
// 페이지를 처음 열었을 때의 주소. 첫 화면과 되돌아온 화면을 가른다.
let firstPath: string | null = null;

export default function NetworkAd({ slot }: { slot: NetworkAdSlot }) {
  const { unit, size } = AD_UNITS[slot];
  const { w, h } = AD_SIZE[size];
  const insRef = useRef<HTMLModElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    // 꺼진 자리는 그리지도 않으니 셈에 넣지 않는다. 여기서 걸러야 빈 자리가
    // 첫 화면 판정을 대신 써버리는 일이 없다.
    if (!unit.trim()) return;

    if (firstPath === null) firstPath = pathname;
    // 아직 첫 화면이다 — 로더가 훑어 채운다. 우리는 비켜선다.
    if (!routeChanged && pathname === firstPath) return;

    routeChanged = true;
    const el = insRef.current;
    if (!el) return;
    // 스크립트가 아직이면 곧 도착해 스스로 훑는다. 그때 채워지므로 그냥 둔다.
    window.adfit?.render?.(el);
  }, [pathname, unit]);

  if (!unit.trim()) return null;

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
          스크립트가 넣는 인라인 display:block 이 클래스를 이긴다.
          key 에 주소를 넣어, 화면을 옮기면 반드시 새 ins 로 갈리게 한다 —
          같은 자리(예: 메인 → 기사 → 메인)로 돌아왔을 때 리액트가 예전 칸을
          그대로 물려주면 애드핏이 그것을 '이미 채운 자리'로 보게 된다. */}
      <ins
        key={pathname}
        ref={insRef}
        className="kakao_ad_area hidden"
        data-ad-unit={unit}
        data-ad-width={String(w)}
        data-ad-height={String(h)}
      />
    </div>
  );
}
