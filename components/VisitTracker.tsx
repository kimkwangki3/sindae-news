"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackVisit } from "@/lib/visit-actions";

// 사이트 접속 집계 — 공개 영역 셸에 붙어 경로가 바뀔 때마다 1건 기록한다.
// 화면에는 아무것도 그리지 않는다. 관리자 대시보드의 "오늘 접속"이 이 값이다.
export default function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;

    // 새로고침·뒤로가기로 같은 페이지를 연달아 여는 건 한 번으로 본다.
    // (개발 모드 StrictMode의 이중 실행도 여기서 걸러진다)
    try {
      const key = `pv:${pathname}`;
      const prev = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - prev < 30_000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // 시크릿 모드 등 sessionStorage 불가 — 그냥 기록한다.
    }

    void trackVisit(pathname);
  }, [pathname]);

  return null;
}
