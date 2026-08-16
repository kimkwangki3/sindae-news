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

    // document.referrer 는 이 문서를 열어 준 곳이다. 카카오톡·검색에서
    // 들어왔으면 그 주소가, 주소를 직접 치거나 앱이 가려버리면 빈 값이 온다
    // (빈 값은 '직접 방문'으로 센다). 서버는 이 값을 대신 알아낼 방법이 없다.
    //
    // 화면 안에서 링크를 타고 옮겨 다니는 동안에는 문서가 바뀌지 않으므로
    // 이 값이 그대로 유지된다 — 그래서 한 번 들어온 사람의 여러 쪽 보기가
    // 모두 같은 유입처로 잡힌다. 그게 우리가 알고 싶은 것이기도 하다.
    void trackVisit(pathname, typeof document !== "undefined" ? document.referrer : "");
  }, [pathname]);

  return null;
}
