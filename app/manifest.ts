import type { MetadataRoute } from "next";

// PWA/설치 기본 매니페스트. 아이콘은 로고 확정 후 추가.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "신대신문",
    short_name: "신대신문",
    description: "신대지구(순천시) 이웃 소식을 전하는 인터넷 신문",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF6F2",
    theme_color: "#FBF6F2",
    lang: "ko",
    icons: [],
  };
}
