"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 화면을 최신으로 유지한다.
//
// 관리자 메뉴 사이 이동은 서버를 다시 타지 않는다 — 브라우저가 이미 받아둔
// 화면을 다시 쓴다. 탭을 열어두면 그대로 굳는다. 그래서 "오늘 접속" 숫자가
// 한참 전 값으로 남아 있었다(실제로 1시간 42분 전 수치를 보고 있었다).
//
// renderedAt은 서버가 이 화면을 그린 시각이다. 받아 보니 오래된 화면이면
// 그 자리에서 다시 받고, 그 뒤로는 주기적으로 갱신한다. 방금 그려진
// 화면이면 그냥 둔다 — 새로 열 때마다 두 번 받아올 필요는 없다.
const STALE_MS = 15_000;

export default function AutoRefresh({
  renderedAt,
  seconds = 60,
}: {
  renderedAt: number;
  seconds?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (Date.now() - renderedAt > STALE_MS) router.refresh();

    // 보이지 않는 탭까지 갱신하면 서버만 두드린다.
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);

    // 뒤로가기로 돌아온 화면은 브라우저가 통째로 얼려 뒀다 되살린다
    // (bfcache). 그때는 이 컴포넌트가 다시 붙지 않아 위 검사가 돌지 않으므로
    // 되살아난 순간을 따로 잡아 갱신한다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router, renderedAt, seconds]);

  return null;
}
