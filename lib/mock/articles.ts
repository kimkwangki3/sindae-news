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
  type HotPeriod,
  type HotItem,
} from "@/lib/mock/articles-meta";

// 타입/상수는 공용 메타에서 (클라이언트 컴포넌트 호환). 여기서 재노출.
export {
  CATEGORY_NAME,
  type CategorySlug,
  type ArticlesPage,
  type HotPeriod,
  type HotItem,
};

export interface MockArticle {
  id: string;
  slug: string;
  category: CategorySlug;
  title: string;
  excerpt: string;
  body: string[]; // 문단 배열
  author: string;
  publishedAt: string; // "2026.06.25"
  views: { day: number; week: number; month: number };
  likeCount: number;
  dislikeCount: number;
  thumbnailUrl: string | null;
}

// timestamptz → "2026.06.25" (로케일 비의존)
function fmtDate(ts: string | null): string {
  if (!ts) return "";
  return ts.slice(0, 10).replace(/-/g, ".");
}

// 본문 text → 문단 배열 (빈 줄 기준 분리, 없으면 줄 단위)
function toParagraphs(body: string | null): string[] {
  if (!body) return [];
  const parts = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [body.trim()].filter(Boolean);
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
      "id, slug, title, body, thumbnail_url, category_id, view_count, published_at, author:profiles(nickname)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;

  const a = data as unknown as {
    id: string;
    slug: string;
    title: string;
    body: string | null;
    thumbnail_url: string | null;
    category_id: number | null;
    view_count: number | null;
    published_at: string | null;
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
    excerpt: "",
    body: toParagraphs(a.body),
    author: a.author?.nickname ?? "편집부",
    publishedAt: fmtDate(a.published_at),
    views: { day: views, week: views, month: views },
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    thumbnailUrl: a.thumbnail_url,
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

const WINDOW_DAYS: Record<HotPeriod, number> = { day: 1, week: 7, month: 30 };

// 핫소식: 기간별 조회수(article_views) 순 랭킹.
// 소규모 가정 JS 집계. 데이터 증가 시 RPC(group by + count)로 전환할 것.
export async function getHot(
  period: HotPeriod,
  limit = 10,
): Promise<HotItem[]> {
  const supabase = createClient();

  // 기간별 집계는 security definer RPC로(원본 article_views는 비노출).
  const { data: agg } = await supabase.rpc("hot_articles", {
    period_days: WINDOW_DAYS[period],
    lim: limit,
  });

  const topIds = ((agg ?? []) as { article_id: string; views: number }[]).map(
    (r) => [r.article_id, Number(r.views)] as [string, number],
  );

  if (topIds.length === 0) {
    // 폴백: RPC 미적용/데이터 없음 → 누적 view_count 상위
    const { data } = await supabase
      .from("articles")
      .select(`${LIST_COLS}, view_count`)
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r, i) => ({
      ...rowToSummary(r as ListRow),
      rank: i + 1,
      views: (r as { view_count: number | null }).view_count ?? 0,
    }));
  }

  const { data: rows } = await supabase
    .from("articles")
    .select(LIST_COLS + ", id")
    .in(
      "id",
      topIds.map(([id]) => id),
    )
    .eq("status", "published");

  const byId = new Map(
    (rows ?? []).map((r) => {
      const row = r as unknown as ListRow & { id: string };
      return [row.id, row as ListRow];
    }),
  );

  const out: HotItem[] = [];
  let rank = 0;
  for (const [id, n] of topIds) {
    const r = byId.get(id);
    if (!r) continue; // 비공개/삭제된 기사 제외
    rank += 1;
    out.push({ ...rowToSummary(r), rank, views: n });
  }
  return out;
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
