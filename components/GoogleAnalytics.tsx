"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// 구글 애널리틱스(GA4) — 공개 영역에만 붙인다.
//
// 관리자·기자 화면은 빼 둔다. 우리가 글을 쓰고 고치느라 드나든 것까지 세면
// 독자 수가 부풀고, 그 숫자를 보고 판단을 내리게 된다. 자체 접속 집계
// (VisitTracker)도 같은 이유로 공개 영역에만 붙어 있다.
//
// ⚠️ 이 태그는 쿠키를 심고 방문 기록을 구글(미국)로 보낸다. 붙이는 순간
//    개인정보처리방침의 쿠키·국외이전 항목이 사실과 맞아야 한다
//    (lib/legal.ts 의 privacy 문서 3·4항에 적어 두었다). 태그를 떼면
//    그 문장도 함께 빼야 한다.
//
// 측정 ID는 HTML 소스에 그대로 나가는 공개값이다. 배포 환경 설정을 빠뜨려
// 집계가 통째로 비는 사고를 막으려고 코드에 적어 둔다. 바꿀 일이 생기면
// 환경변수로 덮어쓴다.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-L41YQ8LO4H";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const ready = useRef(false);

  // 화면 이동을 직접 알린다.
  //
  // 이 사이트는 링크를 눌러도 문서를 새로 받지 않는다(클라이언트 라우팅).
  // 구글 태그는 문서가 열릴 때 한 번만 조회를 보내므로, 그대로 두면 처음
  // 들어온 한 쪽만 집계되고 그 뒤에 읽은 기사들은 통째로 빠진다.
  // 그래서 자동 전송을 끄고(send_page_view: false) 경로가 바뀔 때마다
  // 우리가 보낸다 — 첫 화면도 여기서 함께 보낸다.
  useEffect(() => {
    if (!pathname || !ready.current) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname + (window.location.search || ""),
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga-init"
        strategy="afterInteractive"
        onReady={() => {
          // 스크립트가 준비된 뒤에야 첫 조회를 보낸다. 그 전에 보내면
          // gtag 가 아직 없어 조용히 사라진다.
          ready.current = true;
          window.gtag?.("event", "page_view", {
            page_path: window.location.pathname + window.location.search,
            page_location: window.location.href,
            page_title: document.title,
          });
        }}
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });
          `.trim(),
        }}
      />
    </>
  );
}
