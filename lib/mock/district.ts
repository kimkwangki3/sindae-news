// 해룡상권(업체) 데이터 액세스 — Supabase 실연동.
// 주의: neighborhood는 현재 스키마에 없음 → 기본값.
// 평점/리뷰수는 business_reviews 임베드를 JS로 집계한다(업체 수가 적은 단계).
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { kstDate } from "@/lib/datetime";

export type BizCategory = "food" | "cafe" | "life" | "medical";

export const BIZ_CAT_NAME: Record<BizCategory, string> = {
  food: "맛집",
  cafe: "카페",
  life: "생활·편의",
  medical: "의료",
};

export interface BizMenu {
  name: string;
  price: number;
  popular?: boolean;
}

export interface PromoPost {
  id: string;
  businessId: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  photoUrls: string[];
}

export interface Business {
  id: string;
  name: string;
  category: BizCategory;
  neighborhood: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  kakaoChannel: string | null;
  is24h: boolean;
  hours: string;
  closedDays: string;
  intro: string;
  isPromoted: boolean;
  photoCount: number;
  photos: string[];
  menus: BizMenu[];
  promos: PromoPost[];
}

function embeddedCount(v: unknown): number {
  if (Array.isArray(v) && v.length > 0)
    return Number((v[0] as { count?: number }).count ?? 0);
  return 0;
}

function fmtHours(open: string | null, close: string | null): string {
  if (!open || !close) return "";
  return `${open.slice(0, 5)} ~ ${close.slice(0, 5)}`;
}

// 목록에서도 대표 사진 1장과 평점이 필요하므로 url/rating까지 함께 가져온다.
const LIST_COLS =
  "id, name, category, address, kakao_channel, phone, is_24h, hours_open, hours_close, closed_days, intro, business_photos(url, sort), promo_posts(count), business_reviews(rating)";

// 임베드된 리뷰 배열 → 평균 별점(소수 첫째 자리)과 개수
function aggregateRating(v: unknown): { rating: number; reviewCount: number } {
  const rows = Array.isArray(v) ? (v as { rating: number }[]) : [];
  if (rows.length === 0) return { rating: 0, reviewCount: 0 };
  const sum = rows.reduce((acc, r) => acc + Number(r.rating ?? 0), 0);
  return {
    rating: Math.round((sum / rows.length) * 10) / 10,
    reviewCount: rows.length,
  };
}

// 임베드된 사진 배열 → sort 순 url 목록
function embeddedPhotoUrls(v: unknown): string[] {
  const rows = Array.isArray(v) ? (v as { url: string; sort: number | null }[]) : [];
  return [...rows]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((r) => r.url);
}

function toBusinessSummary(r: Record<string, unknown>): Business {
  const { rating, reviewCount } = aggregateRating(r.business_reviews);
  const photos = embeddedPhotoUrls(r.business_photos);
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as BizCategory,
    neighborhood: "",
    rating,
    reviewCount,
    address: (r.address as string) ?? "",
    phone: (r.phone as string) ?? "",
    kakaoChannel: (r.kakao_channel as string) ?? null,
    is24h: Boolean(r.is_24h),
    hours: fmtHours(r.hours_open as string, r.hours_close as string),
    closedDays: Array.isArray(r.closed_days)
      ? (r.closed_days as string[]).join("·")
      : "",
    intro: (r.intro as string) ?? "",
    isPromoted: embeddedCount(r.promo_posts) > 0,
    photoCount: photos.length,
    photos,
    menus: [],
    promos: [],
  };
}

// 공개 목록 — 승인(approved) 업체만. 홍보(promo 보유) 업체 우선.
export async function getBusinesses(
  category: BizCategory | "all" = "all",
): Promise<Business[]> {
  const supabase = createClient();
  let q = supabase
    .from("businesses")
    .select(LIST_COLS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (category !== "all") q = q.eq("category", category);
  const { data } = await q;
  const list = (data ?? []).map((r) =>
    toBusinessSummary(r as Record<string, unknown>),
  );
  return list.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("businesses")
    .select(LIST_COLS)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return null;

  const base = toBusinessSummary(data as Record<string, unknown>);

  // 사진은 LIST_COLS 임베드로 이미 채워져 있다.
  const [{ data: menus }, { data: promos }] =
    await Promise.all([
      supabase
        .from("business_menus")
        .select("name, price")
        .eq("business_id", id)
        .order("sort", { ascending: true }),
      supabase
        .from("promo_posts")
        .select("id, business_id, title, category, body, created_at, photo_urls")
        .eq("business_id", id)
        .eq("status", "approved")
        .eq("visibility", "visible")
        .order("created_at", { ascending: false }),
    ]);

  base.menus = (menus ?? []).map((m) => {
    const row = m as { name: string; price: number | null };
    return { name: row.name, price: row.price ?? 0 };
  });
  base.promos = (promos ?? []).map((p) => {
    const row = p as {
      id: string;
      business_id: string;
      title: string;
      category: string | null;
      body: string | null;
      created_at: string;
      photo_urls: string[] | null;
    };
    return {
      id: row.id,
      businessId: row.business_id,
      category: row.category ?? "공지",
      title: row.title,
      body: row.body ?? "",
      createdAt: kstDate(row.created_at),
      photoUrls: row.photo_urls ?? [],
    };
  });

  return base;
}

// ---------------------------------------------------------------------
// 리뷰·별점 (business_reviews). 1인 1업체 1건.
// ---------------------------------------------------------------------
export interface BizReview {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
  mine: boolean; // 본인 작성분 → 수정·삭제 노출
}

export async function getBusinessReviews(
  businessId: string,
): Promise<BizReview[]> {
  const supabase = createClient();
  const [{ data }, user] = await Promise.all([
    supabase
      .from("business_reviews")
      .select("id, rating, body, created_at, author_id, author:profiles!author_id(nickname)")
      .eq("business_id", businessId)
      .eq("visibility", "visible")
      .order("created_at", { ascending: false }),
    getCurrentUser(),
  ]);

  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      rating: number;
      body: string | null;
      created_at: string;
      author_id: string;
      author?: { nickname?: string } | null;
    };
    return {
      id: row.id,
      author: row.author?.nickname ?? "익명",
      rating: row.rating,
      body: row.body ?? "",
      createdAt: kstDate(row.created_at),
      mine: Boolean(user && user.id === row.author_id),
    };
  });
}

// 현재 로그인 회원이 이 업체에 이미 남긴 리뷰(수정 폼 초기값용)
export async function getMyBusinessReview(
  businessId: string,
): Promise<BizReview | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const reviews = await getBusinessReviews(businessId);
  return reviews.find((r) => r.mine) ?? null;
}
