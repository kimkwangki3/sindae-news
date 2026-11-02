import { createAnonClient } from "@/lib/supabase/server";
import { MEDIA } from "@/lib/media";

// 구글 뉴스 사이트맵 — 일반 sitemap.xml과 별도이며 최근 48시간 기사만 담는다.
// 오래된 기사를 넣으면 무시되거나 스팸으로 취급될 수 있다.
// Next의 sitemap.ts는 news 네임스페이스를 못 만들어서 라우트로 직접 XML을 낸다.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const WINDOW_HOURS = 48;
const FALLBACK_ARTICLES = 5;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const since = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const latest = () =>
    createAnonClient()
      .from("articles")
      .select("slug, title, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

  const recent = await latest().gte("published_at", since).limit(1000);
  // 이틀 넘게 발행이 없으면 빈 사이트맵이 되고 서치콘솔이 오류로 잡는다
  // (2026-08-10, 11-02 실제 발생). 그럴 때만 최근 기사로 채운다. 48시간이
  // 지난 기사는 구글이 뉴스 후보에서 무시할 뿐 오류로 보지는 않는다.
  const res =
    !recent.error && (recent.data ?? []).length === 0
      ? await latest().limit(FALLBACK_ARTICLES)
      : recent;
  if (res.error) {
    // eslint-disable-next-line no-console
    console.warn("[news-sitemap] 기사 조회 실패:", res.error.message);
  }

  const items = (res.data ?? []) as {
    slug: string;
    title: string;
    published_at: string;
  }[];

  const urls = items
    .map(
      (a) => `  <url>
    <loc>${SITE_URL}/article/${esc(a.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(MEDIA.name)}</news:name>
        <news:language>ko</news:language>
      </news:publication>
      <news:publication_date>${a.published_at}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // 뉴스 사이트맵은 자주 바뀌므로 짧게만 캐시한다.
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
