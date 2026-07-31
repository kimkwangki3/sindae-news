import { createAnonClient } from "@/lib/supabase/server";
import { MEDIA } from "@/lib/media";
import { CATEGORY_NAME, ID_TO_SLUG } from "@/lib/mock/articles-meta";

// RSS 2.0 피드.
// 네이버는 사이트맵보다 RSS를 자주 확인해 새 기사를 빨리 잡아간다.
// 서치어드바이저 [요청 → RSS 제출]에 https://www.sdtime.net/rss.xml 로 등록한다.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const LIMIT = 30;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS의 pubDate는 RFC-822 형식이어야 한다. ISO를 그대로 넣으면 무시된다.
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function rfc822(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${DAY[d.getUTCDay()]}, ${p(d.getUTCDate())} ${MON[d.getUTCMonth()]} ` +
    `${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT`
  );
}

// 본문에서 요약 한 줄 만들기(부제가 없을 때)
function excerpt(body: string | null, max = 200): string {
  if (!body) return "";
  const t = body.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export async function GET(): Promise<Response> {
  const { data } = await createAnonClient()
    .from("articles")
    .select(
      "slug, title, subtitle, body, category_id, published_at, author:profiles!author_id(nickname)",
    )
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(LIMIT);

  const rows = (data ?? []) as unknown as {
    slug: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    category_id: number | null;
    published_at: string;
    author?: { nickname?: string } | null;
  }[];

  const items = rows
    .map((a) => {
      const url = `${SITE_URL}/article/${a.slug}`;
      const cat = a.category_id ? CATEGORY_NAME[ID_TO_SLUG[a.category_id]] : "";
      const desc = a.subtitle ?? excerpt(a.body);
      return `  <item>
    <title>${esc(a.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${esc(desc)}</description>
    <pubDate>${rfc822(a.published_at)}</pubDate>
    <author>${esc(a.author?.nickname ?? "편집부")}</author>${
      cat ? `\n    <category>${esc(cat)}</category>` : ""
    }
  </item>`;
    })
    .join("\n");

  const latest = rows[0]?.published_at;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(MEDIA.name)}</title>
  <link>${SITE_URL}</link>
  <description>순천시 해룡면 신대·선월·복성지구 소식을 전하는 지역 인터넷신문</description>
  <language>ko</language>
  <copyright>© ${MEDIA.name}</copyright>
  <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />${
    latest ? `\n  <lastBuildDate>${rfc822(latest)}</lastBuildDate>` : ""
  }
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=600",
    },
  });
}
