import type { MetadataRoute } from "next";

// PWA/설치 기본 매니페스트. 아이콘은 로고 확정 후 추가.
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
    icons: [],
  };
}
