"use client";

import { useEffect, useRef } from "react";
import { trackArticleView } from "@/app/(public)/articles/actions";

// 조회/읽음 집계 — 기사 상세에 마운트되어 최대 스크롤 도달률(읽음률)과 체류 시간을 측정,
// 이탈(탭 숨김/페이지 이탈) 시 1회 서버로 전송한다. 화면에는 아무것도 그리지 않는다.
// Phase 2: trackArticleView 내부가 article_views insert(+IP 해시)로 교체됨.
export default function ReadTracker({ slug }: { slug: string }) {
  const enteredAt = useRef(0);
  const maxScrollPct = useRef(0);
  const sent = useRef(false);

  useEffect(() => {
    enteredAt.current = performance.now();

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct =
        scrollable <= 0
          ? 100
          : Math.round((doc.scrollTop / scrollable) * 100);
      if (pct > maxScrollPct.current) maxScrollPct.current = pct;
    }

    function flush() {
      if (sent.current) return;
      sent.current = true;
      void trackArticleView({
        slug,
        scrollPct: Math.min(100, maxScrollPct.current),
        dwellMs: Math.round(performance.now() - enteredAt.current),
      });
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush(); // SPA 라우팅으로 언마운트될 때도 1회 기록
    };
  }, [slug]);

  return null;
}
