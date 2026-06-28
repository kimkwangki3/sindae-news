import type { MetadataRoute } from "next";
import { createAnonClient } from "@/lib/supabase/server";
import { getMarketPosts, getBoardPosts } from "@/lib/mock/community";
import { getBusinesses } from "@/lib/mock/district";
import { getOrgs } from "@/lib/mock/orgs";
import { LEGAL_LINKS } from "@/lib/legal";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// DB(쿠키 클라이언트 경유) 조회를 포함하므로 요청 시점 생성.
export const dynamic = "force-dynamic";

// 정적 + Supabase 발행 기사 + 목 데이터 경로 사이트맵.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (path: string) => `${SITE_URL}${path}`;

  const staticPaths = [
    "/",
    "/articles",
    "/hot",
    "/district",
    "/orgs",
    "/market",
    "/board",
    "/tips",
    "/recruit",
    "/search",
    "/ads/apply",
  ];

  const { data: articleRows } = await createAnonClient()
    .from("articles")
    .select("slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);
  const articles = (articleRows ?? []).map((a) =>
    u(`/article/${(a as { slug: string }).slug}`),
  );
  const market = (await getMarketPosts("all")).map((p) => u(`/market/${p.id}`));
  const board = (await getBoardPosts("all")).map((p) => u(`/board/${p.id}`));
  const district = (await getBusinesses("all")).map((b) =>
    u(`/district/${b.id}`),
  );
  const orgs = (await getOrgs("all")).map((o) => u(`/orgs/${o.id}`));
  const legal = LEGAL_LINKS.map((l) => u(`/legal/${l.slug}`));

  return [
    ...staticPaths.map((p) => u(p)),
    ...articles,
    ...market,
    ...board,
    ...district,
    ...orgs,
    ...legal,
  ].map((url) => ({ url }));
}
