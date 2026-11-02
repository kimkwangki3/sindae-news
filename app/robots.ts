import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PRIVATE_PATHS = [
  "/admin",
  "/me",
  "/onboarding",
  "/welcome",
  "/login",
  "/auth/",
];

// 검색·AI 로봇을 이름으로 밝혀 허용한다. 이름이 적힌 로봇은 "*" 묶음을 읽지
// 않으므로 차단 경로를 똑같이 줘야 한다 — 빠뜨리면 /admin 이 열린다.
const SEARCH_AND_AI_BOTS = [
  "Googlebot",
  "Bingbot",
  "Yeti", // 네이버
  "Daumoa", // 다음
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];

// 공개 콘텐츠는 색인 허용, 관리/개인 영역은 차단.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: SEARCH_AND_AI_BOTS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    // 일반 사이트맵 + 뉴스 사이트맵(최근 48시간 기사)을 함께 알린다.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}
