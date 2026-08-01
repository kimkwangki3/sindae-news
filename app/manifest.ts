import type { MetadataRoute } from "next";

// PWA/설치 기본 매니페스트.
// 브라우저 탭 아이콘은 app/icon.png, iOS 홈화면은 app/apple-icon.png 가
// 파일 이름만으로 자동 연결된다(Next.js 규칙). 여기 icons 는 안드로이드
// '홈 화면에 추가' 용이다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "해룡신문",
    short_name: "해룡신문",
    description: "순천시 해룡면 신대·선월·복성지구 소식을 전하는 지역 인터넷신문",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6F2",
    theme_color: "#FBF6F2",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
