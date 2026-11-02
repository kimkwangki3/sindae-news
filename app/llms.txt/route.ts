import { createAnonClient } from "@/lib/supabase/server";
import { getInfoPages } from "@/lib/info";
import { MEDIA } from "@/lib/media";

// llms.txt — AI 검색이 이 매체가 무엇인지, 어디를 읽으면 되는지 한 번에 알게 하는
// 요약 파일. 도메인·발행 정보는 NEXT_PUBLIC_SITE_URL·lib/media.ts 한 곳에서만 온다.
// 자택이 드러나는 소재지와 개인 전화번호는 넣지 않는다.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const RECENT_ARTICLES = 30;

export async function GET(): Promise<Response> {
  const u = (path: string) => `${SITE_URL}${path}`;

  const { data, error } = await createAnonClient()
    .from("articles")
    .select("slug, title")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(RECENT_ARTICLES);
  // 조회가 실패해도 매체 정보는 내보낸다. 기사 목록만 빠진 파일이 낫다.
  // eslint-disable-next-line no-console
  if (error) console.warn("[llms] 기사 조회 실패:", error.message);

  const articles = ((data ?? []) as { slug: string; title: string }[]).map(
    (a) => `- [${a.title}](${u(`/article/${a.slug}`)})`,
  );
  const info = (await getInfoPages()).map(
    (p) =>
      `- [${p.title}](${u(`/info/${p.slug}`)})${p.summary ? `: ${p.summary}` : ""}`,
  );

  const body = [
    `# ${MEDIA.name}`,
    "",
    `> 전남 순천시 해룡면(신대·복성·선월지구) 소식을 전하는 등록 ${MEDIA.kind}입니다.`,
    "",
    `- 등록번호: ${MEDIA.regNo} (${MEDIA.regDate} 등록)`,
    `- 보도 지역: 순천시 해룡면, 순천시 전반`,
    `- 발행인·편집인: ${MEDIA.publisher}`,
    `- 문의: ${MEDIA.email}`,
    `- 기사 인용 시 매체명(${MEDIA.name})과 기사 주소를 함께 밝혀 주세요.`,
    "",
    "## 주요 페이지",
    `- [해룡면 안내](${u("/haeryong")}): 해룡면과 신대·복성·선월지구 기본 정보와 자주 묻는 질문`,
    `- [기사 목록](${u("/articles")})`,
    `- [생활정보](${u("/info")})`,
    `- [기자 소개](${u("/reporters")})`,
    `- [매체 정보](${u("/legal/publisher")})`,
    `- [RSS](${u("/rss.xml")})`,
    "",
    ...(info.length > 0 ? ["## 생활정보", ...info, ""] : []),
    ...(articles.length > 0 ? ["## 최근 기사", ...articles, ""] : []),
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
