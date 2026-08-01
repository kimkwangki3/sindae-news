// 기사 데이터 액세스 — Supabase(articles/article_reactions/article_views) 실연동.
// 파일명은 과거 호환을 위해 유지(원래 목 단계 경로). 시그니처는 동일하나 전부 async.
// 핫소식 집계는 현재 JS 집계(소규모용) — 트래픽 증가 시 Postgres RPC/뷰로 전환 권장.

import { createClient } from "@/lib/supabase/server";
import type { ArticleSummary } from "@/components/ArticleListItem";
import {
  CATEGORY_ID,
  CATEGORY_NAME,
  ID_TO_SLUG,
  type CategorySlug,
  type ArticlesPage,
} from "@/lib/mock/articles-meta";

// 타입/상수는 공용 메타에서 (클라이언트 컴포넌트 호환). 여기서 재노출.
export {
  CATEGORY_NAME,
  type CategorySlug,
  type ArticlesPage,
};

export interface MockArticle {
  id: string;
  slug: string;
  category: CategorySlug;
  title: string;
  subtitle: string | null; // 부제 — 상세 화면에만 노출
  excerpt: string;
  body: string[]; // 문단 배열
  author: string;
  publishedAt: string; // "2026.06.25" — 화면 표시용
  publishedAtIso: string | null; // 구조화 데이터(datePublished)용 원본
  updatedAtIso: string | null; // dateModified용. 발행 후 수정한 적 없으면 null
  views: { day: number; week: number; month: number };
  likeCount: number;
  dislikeCount: number;
  thumbnailUrl: string | null;
  aiText: boolean; // 본문을 AI로 작성·생성했는지
  aiImage: boolean; // 대표 이미지를 AI로 생성했는지
  sourceName: string | null; // 출처 기관 (보도자료 재구성 시)
  sourceUrl: string | null; // 원문 링크
}

// timestamptz → "2026.06.25" (로케일 비의존)
function fmtDate(ts: string | null): string {
  if (!ts) return "";
  return ts.slice(0, 10).replace(/-/g, ".");
}

// 본문 text → 문단 배열.
// 브라우저 textarea는 줄바꿈을 CRLF(\r\n)로 보낸다. 정규화하지 않으면
// 빈 줄이 \r\n\r\n 이 되어 /\n{2,}/ 에 걸리지 않고 전부 한 문단으로 뭉친다.
// 빈 줄이 있으면 그 기준으로, 없으면 단일 줄바꿈을 문단 구분으로 본다.
function toParagraphs(body: string | null): string[] {
  if (!body) return [];
  const text = body.replace(/\r\n?/g, "\n");
  const byBlankLine = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlankLine.length > 1) return byBlankLine;
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type ListRow = {
  slug: string;
  title: string;
  thumbnail_url: string | null;
  category_id: number | null;
  published_at: string | null;
};

function rowToSummary(r: ListRow): ArticleSummary {
  const slug = r.category_id ? ID_TO_SLUG[r.category_id] : "local";
  const name = CATEGORY_NAME[slug];
  return {
    slug: r.slug,
    category: name,
    title: r.title,
    meta: `${name} · ${fmtDate(r.published_at)}`,
    thumbnailUrl: r.thumbnail_url,
  };
}

const LIST_COLS = "slug, title, thumbnail_url, category_id, published_at";

// 무한스크롤용 페이지네이션. cursor = 시작 인덱스(.range). category 없으면 전체.
export async function getArticlesPage(
  category: CategorySlug | null,
  cursor = 0,
  limit = 6,
): Promise<ArticlesPage> {
  const supabase = createClient();
  let q = supabase
    .from("articles")
    .select(LIST_COLS, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .range(cursor, cursor + limit - 1);

  if (category) q = q.eq("category_id", CATEGORY_ID[category]);

  const { data, count, error } = await q;
  if (error) {
    // 조회 실패 시 빈 페이지로 안전 폴백(화면 깨짐 방지)
    return { items: [], nextCursor: null };
  }

  const items = (data ?? []).map((r) => rowToSummary(r as ListRow));
  const next = cursor + limit;
  return {
    items,
    nextCursor: count !== null && next < count ? next : null,
  };
}

export async function getArticleBySlug(
  slug: string,
): Promise<MockArticle | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id, slug, title, subtitle, body, thumbnail_url, category_id, view_count, published_at, updated_at, ai_text, ai_image, source_name, source_url, author:profiles!author_id(nickname)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  // 조회 오류를 그냥 null로 넘기면 화면엔 404만 뜨고 원인이 안 남는다.
  // eslint-disable-next-line no-console
  if (error) console.error(`[article] ${slug} 조회 실패:`, error.message);
  if (error || !data) return null;

  const a = data as unknown as {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    thumbnail_url: string | null;
    category_id: number | null;
    view_count: number | null;
    published_at: string | null;
    updated_at: string | null;
    ai_text: boolean | null;
    ai_image: boolean | null;
    source_name: string | null;
    source_url: string | null;
    author?: { nickname?: string } | null;
  };

  // 반응 집계 (IP/유저별 1건, type별 개수)
  const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
    supabase
      .from("article_reactions")
      .select("*", { count: "exact", head: true })
      .eq("article_id", a.id)
      .eq("type", "like"),
    supabase
      .from("article_reactions")
      .select("*", { count: "exact", head: true })
      .eq("article_id", a.id)
      .eq("type", "dislike"),
  ]);

  const cat = a.category_id ? ID_TO_SLUG[a.category_id] : "local";
  const views = a.view_count ?? 0;

  return {
    id: a.id,
    slug: a.slug,
    category: cat,
    title: a.title,
    subtitle: a.subtitle,
    excerpt: "",
    body: toParagraphs(a.body),
    author: a.author?.nickname ?? "편집부",
    publishedAt: fmtDate(a.published_at),
    publishedAtIso: a.published_at,
    // 발행 이후 실제로 고친 적이 있을 때만 dateModified로 쓴다.
    // 없는데 최신 시각을 넣으면 검색엔진이 날짜 조작으로 본다.
    updatedAtIso:
      a.updated_at && a.published_at && a.updated_at > a.published_at
        ? a.updated_at
        : null,
    views: { day: views, week: views, month: views },
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    thumbnailUrl: a.thumbnail_url,
    aiText: a.ai_text ?? false,
    aiImage: a.ai_image ?? false,
    sourceName: a.source_name,
    sourceUrl: a.source_url,
  };
}

// 같은 카테고리 다른 기사 추천
export async function getRelated(
  slug: string,
  limit = 3,
): Promise<ArticleSummary[]> {
  const supabase = createClient();
  const { data: cur } = await supabase
    .from("articles")
    .select("category_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cur) return [];

  const { data } = await supabase
    .from("articles")
    .select(LIST_COLS)
    .eq("status", "published")
    .eq("category_id", (cur as { category_id: number }).category_id)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => rowToSummary(r as ListRow));
}

// 홈 헤드라인(가장 최신 1건). 기사 없으면 null.
export async function getLead(): Promise<MockArticle | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return getArticleBySlug((data as { slug: string }).slug);
}
