import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 공개 콘텐츠는 색인 허용, 관리/개인 영역은 차단.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/me", "/onboarding", "/login", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
