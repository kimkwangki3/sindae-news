// 기자 공간 데이터 액세스 — 본인 기사 요약/목록/통계. 쿠키 클라이언트(RLS: 본인 글 조회 허용).
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_NAME, ID_TO_SLUG } from "@/lib/mock/articles-meta";

export type MyArticleStatus = "draft" | "pending" | "published" | "archived";

export const ARTICLE_STATUS_LABEL: Record<MyArticleStatus, string> = {
  draft: "임시저장",
  pending: "승인대기",
  published: "발행",
  archived: "보관",
};

export interface ReporterSummary {
  total: number;
  published: number;
  pending: number;
  draft: number;
  views: number;
  comments: number;
  likes: number;
}

export interface MyArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: MyArticleStatus;
  views: number;
  comments: number;
  reactions: number;
  date: string; // 발행일 or 작성일
}

function embeddedCount(v: unknown): number {
  if (Array.isArray(v) && v.length > 0)
    return Number((v[0] as { count?: number }).count ?? 0);
  return 0;
}

// 대시보드 요약 통계
export async function getReporterSummary(
  userId: string,
): Promise<ReporterSummary> {
  const supabase = createClient();
  const { data: arts } = await supabase
    .from("articles")
    .select("id, status, view_count")
    .eq("author_id", userId);

  const rows = (arts ?? []) as {
    id: string;
    status: MyArticleStatus;
    view_count: number | null;
  }[];

  const ids = rows.map((r) => r.id);
  let comments = 0;
  let likes = 0;
  if (ids.length > 0) {
    const [{ count: c }, { count: l }] = await Promise.all([
      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .in("article_id", ids),
      supabase
        .from("article_reactions")
        .select("*", { count: "exact", head: true })
        .in("article_id", ids)
        .eq("type", "like"),
    ]);
    comments = c ?? 0;
    likes = l ?? 0;
  }

  return {
    total: rows.length,
    published: rows.filter((r) => r.status === "published").length,
    pending: rows.filter((r) => r.status === "pending").length,
    draft: rows.filter((r) => r.status === "draft").length,
    views: rows.reduce((s, r) => s + (r.view_count ?? 0), 0),
    comments,
    likes,
  };
}

// 내 기사 목록 (상태 필터: all | draft | pending | published)
export async function getMyArticles(
  userId: string,
  status: "all" | MyArticleStatus = "all",
): Promise<MyArticleRow[]> {
  const supabase = createClient();
  let q = supabase
    .from("articles")
    .select(
      "id, slug, title, category_id, status, view_count, published_at, created_at, comments(count), article_reactions(count)",
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);

  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const catId = row.category_id as number | null;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      category: catId ? CATEGORY_NAME[ID_TO_SLUG[catId]] ?? "" : "",
      status: row.status as MyArticleStatus,
      views: Number(row.view_count ?? 0),
      comments: embeddedCount(row.comments),
      reactions: embeddedCount(row.article_reactions),
      date: ((row.published_at as string) ?? (row.created_at as string) ?? "")
        .slice(0, 10)
        .replace(/-/g, "."),
    };
  });
}

// 단일 기사 통계 상세 (본인 기사)
export interface ArticleStats {
  title: string;
  slug: string;
  status: MyArticleStatus;
  totalViews: number;
  uniqueVisitors: number;
  avgScroll: number;
  avgDwellSec: number;
  likes: number;
  dislikes: number;
  comments: number;
}

export async function getArticleStats(
  userId: string,
  articleId: string,
): Promise<ArticleStats | null> {
  const supabase = createClient();
  const { data: art } = await supabase
    .from("articles")
    .select("id, title, slug, status, view_count, author_id")
    .eq("id", articleId)
    .maybeSingle();
  if (!art) return null;
  const a = art as {
    id: string;
    title: string;
    slug: string;
    status: MyArticleStatus;
    view_count: number | null;
    author_id: string | null;
  };
  // 본인 기사만(관리자는 RLS로 허용되지만 기자 통계는 본인 한정)
  if (a.author_id !== userId) return null;

  const [{ data: views }, { count: likes }, { count: dislikes }, { count: comments }] =
    await Promise.all([
      supabase
        .from("article_views")
        .select("ip_hash, scroll_pct, dwell_ms")
        .eq("article_id", articleId)
        .limit(10000),
      supabase
        .from("article_reactions")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId)
        .eq("type", "like"),
      supabase
        .from("article_reactions")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId)
        .eq("type", "dislike"),
      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleId),
    ]);

  const vrows = (views ?? []) as {
    ip_hash: string;
    scroll_pct: number | null;
    dwell_ms: number | null;
  }[];
  const uniq = new Set(vrows.map((v) => v.ip_hash)).size;
  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;

  return {
    title: a.title,
    slug: a.slug,
    status: a.status,
    totalViews: a.view_count ?? vrows.length,
    uniqueVisitors: uniq,
    avgScroll: avg(vrows.map((v) => v.scroll_pct ?? 0)),
    avgDwellSec: Math.round(
      avg(vrows.map((v) => v.dwell_ms ?? 0)) / 1000,
    ),
    likes: likes ?? 0,
    dislikes: dislikes ?? 0,
    comments: comments ?? 0,
  };
}
