// Phase 6 광고 슬롯(목). 후속: ad_slots/ads 테이블로 교체(슬롯별 활성 배너 1건 조회).
// 자동 광고(애드핏/애드센스)는 별도 스크립트 영역, 여기선 수동 배너 슬롯만 모델링.

export type AdSlotKey =
  | "home-top"
  | "article-mid"
  | "district-top"
  | "market-infeed";

export interface Ad {
  advertiser: string;
  text: string;
  href: string;
  imageUrl: string | null;
}

export const SLOT_LABEL: Record<AdSlotKey, string> = {
  "home-top": "홈 상단 배너",
  "article-mid": "기사 중간 배너",
  "district-top": "상권 상단 배너",
  "market-infeed": "나눔마켓 인피드",
};

import { createClient } from "@/lib/supabase/server";

// AdSlotKey(하이픈) → DB ad_slots.key(언더스코어)
function dbKey(slot: AdSlotKey): string {
  return slot.replace(/-/g, "_");
}

// 슬롯별 활성 광고 1건 조회. 없으면 null(→ '광고 문의' 자리표시).
export async function getAd(slot: AdSlotKey): Promise<Ad | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ads")
    .select("advertiser, link_url, image_url, ad_slots!inner(key)")
    .eq("ad_slots.key", dbKey(slot))
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const ad = data as {
    advertiser: string | null;
    link_url: string | null;
    image_url: string | null;
  };
  return {
    advertiser: ad.advertiser ?? "광고",
    text: "자세히 보기",
    href: ad.link_url ?? "#",
    imageUrl: ad.image_url ?? null,
  };
}
