// 첫 화면 데이터. 선정 규칙은 lib/frontpage.ts 의 순수 함수가 맡고, 여기서는
// 재료만 모은다.

import { createClient } from "@/lib/supabase/server";
import { kstDate } from "@/lib/datetime";
import type { ArticleSummary } from "@/components/ArticleListItem";
import { CATEGORY_NAME, ID_TO_SLUG } from "@/lib/mock/articles-meta";
import {
  pickFrontPage,
  type FrontPick,
  type FrontSlot,
  type FrontSlotKey,
} from "@/lib/frontpage";

export interface FrontArticle extends ArticleSummary {
  id: string;
  subtitle: string | null;
  date: string;
  author: string;
  aiImage: boolean;
  imageCredit: string | null;
}

const COLS =
  "id, slug, title, subtitle, thumbnail_url, category_id, published_at, status, ai_image, image_credit, author:profiles!author_id(nickname)";

type Row = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  category_id: number | null;
  published_at: string | null;
  status: string;
  ai_image: boolean | null;
  image_credit: string | null;
  author?: { nickname?: string } | null;
};

function toFront(r: Row): FrontArticle {
  const cat = r.category_id ? ID_TO_SLUG[r.category_id] : "local";
  const name = CATEGORY_NAME[cat];
  const date = r.published_at ? kstDate(r.published_at) : "";
  return {
    id: r.id,
    slug: r.slug,
    category: name,
    title: r.title,
    subtitle: r.subtitle,
    meta: `${name} · ${date}`,
    thumbnailUrl: r.thumbnail_url,
    date,
    author: r.author?.nickname ?? "편집부",
    aiImage: r.ai_image ?? false,
    imageCredit: r.image_credit,
  };
}

// 첫 화면을 채우고도 남을 만큼. 분류별 묶음은 따로 받는다.
const LATEST_LIMIT = 40;

export async function getLatestFront(): Promise<FrontArticle[]> {
  const { data, error } = await createClient()
    .from("articles")
    .select(COLS)
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(LATEST_LIMIT);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[frontpage] 최신 기사 조회 실패:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[]).map(toFront);
}

// 편성표를 읽지 못해도 첫 화면은 최신순으로 나가야 한다. 마이그레이션 전이거나
// DB가 흔들려도 사이트를 세우지 않고, 사유만 로그에 남긴다.
export async function getFrontSlots(): Promise<FrontSlot<FrontArticle>[]> {
  const { data, error } = await createClient()
    .from("front_page_slots")
    .select(`slot, short_title, pinned, expires_at, article:articles(${COLS})`);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[frontpage] 편성표 조회 실패, 최신순으로 표시:", error.message);
    return [];
  }
  return (
    (data ?? []) as unknown as {
      slot: FrontSlotKey;
      short_title: string | null;
      pinned: boolean;
      expires_at: string | null;
      article: Row | null;
    }[]
  ).map((r) => ({
    slot: r.slot,
    article:
      r.article?.status === "published" && r.article.published_at
        ? toFront(r.article)
        : null,
    shortTitle: r.short_title,
    pinned: r.pinned,
    expiresAt: r.expires_at,
  }));
}

export async function getFrontPage(): Promise<FrontPick<FrontArticle>> {
  const [slots, latest] = await Promise.all([getFrontSlots(), getLatestFront()]);
  return pickFrontPage(slots, latest, Date.now());
}

export interface MostRead {
  slug: string;
  title: string;
}

// 많이 본 기사. 방문이 적은 주에는 일주일치로 칸이 안 차서 30일치로 채운다.
export async function getMostRead(limit = 5): Promise<MostRead[]> {
  const supabase = createClient();
  const week = await supabase.rpc("hot_articles", { period_days: 7, lim: limit });
  const month = await supabase.rpc("hot_articles", {
    period_days: 30,
    lim: limit,
  });
  if (week.error || month.error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[frontpage] 많이 본 기사 집계 실패:",
      week.error?.message ?? month.error?.message,
    );
    return [];
  }
  const ids = [
    ...new Set(
      [...(week.data ?? []), ...(month.data ?? [])].map(
        (r: { article_id: string }) => r.article_id,
      ),
    ),
  ].slice(0, limit);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title")
    .in("id", ids);
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[frontpage] 많이 본 기사 제목 조회 실패:", error.message);
    return [];
  }
  const byId = new Map(
    ((data ?? []) as { id: string; slug: string; title: string }[]).map((a) => [
      a.id,
      a,
    ]),
  );
  return ids.flatMap((id) => {
    const a = byId.get(id);
    return a ? [{ slug: a.slug, title: a.title }] : [];
  });
}
