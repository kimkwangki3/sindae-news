import type { MetadataRoute } from "next";
import { createAnonClient } from "@/lib/supabase/server";
import { getMarketPosts, getBoardPosts } from "@/lib/mock/community";
import { getBusinesses } from "@/lib/mock/district";
import { getOrgs } from "@/lib/mock/orgs";
import { LEGAL_LINKS } from "@/lib/legal";
import { FEATURES } from "@/lib/features";
import { STAFF } from "@/lib/staff";
import { getInfoPages } from "@/lib/info";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// DB(쿠키 클라이언트 경유) 조회를 포함하므로 요청 시점 생성.
export const dynamic = "force-dynamic";
// force-dynamic은 라우트를 매 요청 실행시킬 뿐, 그 안의 데이터 캐시는 따로 남는다.
// 이게 빠져 있어 사이트맵이 옛 목록에 머물렀고 새 기사가 색인되지 않았다.
// rss.xml·news-sitemap.xml과 동일하게 캐시를 끈다.
export const revalidate = 0;

// 정적 + Supabase 발행 기사 + 목 데이터 경로 사이트맵.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (path: string) => `${SITE_URL}${path}`;

  // 색인시키지 않는 화면(/search, 글쓰기 폼 등)은 넣지 않는다. noindex인 주소를
  // 사이트맵에 함께 올리면 서치콘솔이 모순으로 잡는다.
  const staticPaths = [
    "/",
    "/articles",
    "/district",
    "/orgs",
    ...(FEATURES.market ? ["/market"] : []),
    "/board",
    "/haeryong",
    "/info",
    "/tips",
    ...(FEATURES.recruit ? ["/recruit"] : []),
    "/reporters",
    "/ads/apply",
  ];

  // lastModified는 실제 수정 시각이 있는 곳에만 붙인다. 없는 곳에 매 요청마다
  // '지금'을 적으면 전부 방금 바뀐 것처럼 보여, 구글이 이 값을 아예 무시한다.
  const info = (await getInfoPages()).map((p) => ({
    url: u(`/info/${p.slug}`),
    lastModified: new Date(p.updatedAt),
  }));

  const { data: articleRows, error: articleError } = await createAnonClient()
    .from("articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);
  // 조회가 실패해도 200이 나가면 기사 없는 사이트맵이 조용히 배포된다.
  // eslint-disable-next-line no-console
  if (articleError) console.error("[sitemap] 기사 조회 실패:", articleError.message);
  const articles = ((articleRows ?? []) as {
    slug: string;
    updated_at: string;
  }[]).map((a) => ({
    url: u(`/article/${a.slug}`),
    lastModified: new Date(a.updated_at),
  }));
  // 내려둔 섹션은 색인되지 않게 사이트맵에서도 뺀다.
  const market = FEATURES.market
    ? (await getMarketPosts("all")).map((p) => u(`/market/${p.id}`))
    : [];
  const board = (await getBoardPosts("all")).map((p) => u(`/board/${p.id}`));
  const district = (await getBusinesses("all")).map((b) =>
    u(`/district/${b.id}`),
  );
  const orgs = (await getOrgs("all")).map((o) => u(`/orgs/${o.id}`));
  const legal = LEGAL_LINKS.map((l) => u(`/legal/${l.slug}`));
  const reporters = STAFF.map((s) => u(`/reporters/${s.handle}`));

  // 수정 시각을 모르는 주소는 <loc>만 낸다.
  const plain = [
    ...staticPaths.map((p) => u(p)),
    ...reporters,
    ...market,
    ...board,
    ...district,
    ...orgs,
    ...legal,
  ].map((url) => ({ url }));

  return [...plain, ...articles, ...info];
}
