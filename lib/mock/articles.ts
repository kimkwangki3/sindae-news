// 기사 데이터 액세스 — Supabase(articles/article_reactions/article_views) 실연동.
// 파일명은 과거 호환을 위해 유지(원래 목 단계 경로). 시그니처는 동일하나 전부 async.
// 핫소식 집계는 현재 JS 집계(소규모용) — 트래픽 증가 시 Postgres RPC/뷰로 전환 권장.

import { createClient } from "@/lib/supabase/server";
import type { ArticleSummary } from "@/components/ArticleListItem";
import { toTags } from "@/lib/tags";
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
  tags: string[]; // #키워드 — 카테고리를 가로지르는 주제 묶음
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
      "id, slug, title, subtitle, body, thumbnail_url, category_id, view_count, published_at, updated_at, ai_text, ai_image, source_name, source_url, tags, author:profiles!author_id(nickname)",
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
    tags: string[] | null;
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
    tags: toTags(a.tags),
  };
}

// 태그 하나에 걸린 기사 목록. 배열 포함 연산(@>) — GIN 인덱스를 탄다.
export async function getArticlesByTag(
  tag: string,
  limit = 30,
): Promise<ArticleSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_COLS)
    .eq("status", "published")
    .not("published_at", "is", null)
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => rowToSummary(r as ListRow));
}

export interface TagCount {
  tag: string;
  count: number;
}

// 많이 쓰인 태그 순. 기사 수가 작아 JS에서 센다.
// 수천 건 규모가 되면 unnest + group by 하는 뷰나 RPC로 옮긴다.
export async function getTopTags(limit = 20): Promise<TagCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("tags")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(500);

  if (error) return [];

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { tags: unknown }[]) {
    for (const tag of toTags(row.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    // 많이 쓰인 순, 같으면 가나다순 — 순서가 매번 달라지지 않게 한다.
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ko"))
    .slice(0, limit);
}

// 관련 기사 추천 — 태그가 겹치는 기사를 먼저, 모자라면 같은 카테고리로 채운다.
// 카테고리는 4개뿐이라 그것만 보면 "행정" 기사 아무거나가 붙는다.
// 태그가 겹치면 같은 사안의 앞뒤 보도일 가능성이 높다.
export async function getRelated(
  slug: string,
  limit = 3,
): Promise<ArticleSummary[]> {
  const supabase = createClient();
  const { data: cur } = await supabase
    .from("articles")
    .select("category_id, tags")
    .eq("slug", slug)
    .maybeSingle();
  if (!cur) return [];

  const { category_id: categoryId, tags } = cur as {
    category_id: number | null;
    tags: unknown;
  };
  const myTags = toTags(tags);

  const picked: ListRow[] = [];
  const seen = new Set<string>([slug]);

  if (myTags.length > 0) {
    // overlaps = 하나라도 겹치면(&&). contains(@>)는 전부 겹쳐야 해서 너무 좁다.
    //
    // 다만 '순천시'처럼 거의 모든 기사에 붙는 태그가 있어서, 하나만 겹쳐도
    // 후보가 되면 사실상 최신순이 된다. 그래서 넉넉히 뽑아온 뒤 겹친 태그
    // 개수로 다시 줄 세운다 — 많이 겹칠수록 같은 사안일 가능성이 높다.
    const { data } = await supabase
      .from("articles")
      .select(`${LIST_COLS}, tags`)
      .eq("status", "published")
      .not("published_at", "is", null)
      .overlaps("tags", myTags)
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(30);

    const mine = new Set(myTags);
    const scored = ((data ?? []) as (ListRow & { tags: unknown })[])
      .map((r) => ({
        row: r,
        hits: toTags(r.tags).filter((t) => mine.has(t)).length,
      }))
      // 겹친 개수 내림차순. 같으면 위 쿼리가 준 최신순 그대로 둔다.
      .sort((a, b) => b.hits - a.hits);

    for (const { row } of scored.slice(0, limit)) {
      picked.push(row);
      seen.add(row.slug);
    }
  }

  if (picked.length < limit && categoryId !== null) {
    const { data } = await supabase
      .from("articles")
      .select(LIST_COLS)
      .eq("status", "published")
      .eq("category_id", categoryId)
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(limit + seen.size);
    for (const r of (data ?? []) as ListRow[]) {
      if (picked.length >= limit) break;
      if (seen.has(r.slug)) continue;
      picked.push(r);
      seen.add(r.slug);
    }
  }

  return picked.slice(0, limit).map(rowToSummary);
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
