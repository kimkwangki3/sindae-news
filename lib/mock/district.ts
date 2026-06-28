// 신대상권(업체) 데이터 액세스 — Supabase 실연동.
// 주의: rating/reviewCount/neighborhood는 현재 스키마에 없음 → 기본값(후속 리뷰 기능).
import { createClient } from "@/lib/supabase/server";

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

const LIST_COLS =
  "id, name, category, address, kakao_channel, phone, is_24h, hours_open, hours_close, closed_days, intro, business_photos(count), promo_posts(count)";

function toBusinessSummary(r: Record<string, unknown>): Business {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as BizCategory,
    neighborhood: "",
    rating: 0,
    reviewCount: 0,
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
    photoCount: embeddedCount(r.business_photos),
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

  const [{ data: menus }, { data: promos }] = await Promise.all([
    supabase
      .from("business_menus")
      .select("name, price")
      .eq("business_id", id)
      .order("sort", { ascending: true }),
    supabase
      .from("promo_posts")
      .select("id, business_id, title, category, body, created_at")
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
    };
    return {
      id: row.id,
      businessId: row.business_id,
      category: row.category ?? "공지",
      title: row.title,
      body: row.body ?? "",
      createdAt: row.created_at.slice(0, 10).replace(/-/g, "."),
    };
  });

  return base;
}
