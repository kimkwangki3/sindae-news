"use server";

import { createClient } from "./supabase/server";
import { getCurrentUser } from "./auth";

export interface AdRequestState {
  ok?: boolean;
  error?: string;
}

// 배너 광고 신청 — 로그인 + 업체 등록 회원만. 관리자 확인·승인 후 게재.
export async function submitAdRequest(
  _prev: AdRequestState,
  formData: FormData,
): Promise<AdRequestState> {
  // 로그인 + 업체 등록 가드(UI와 이중)
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (!user.business)
    return { error: "업체 등록을 한 회원만 광고를 신청할 수 있습니다." };

  const advertiser = String(formData.get("advertiser") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  if (advertiser.length < 2) return { error: "업체명/광고주를 입력해 주세요." };
  if (contact.length < 5) return { error: "연락처를 입력해 주세요." };

  const supabase = createClient();

  // 신청 위치(라벨) → ad_slots.id 매핑(없으면 null)
  let slotId: number | null = null;
  if (position) {
    const { data: slot } = await supabase
      .from("ad_slots")
      .select("id")
      .eq("label", position)
      .maybeSingle();
    slotId = slot ? (slot as { id: number }).id : null;
  }

  const { error } = await supabase.from("ad_requests").insert({
    advertiser,
    slot_id: slotId,
    link_url: String(formData.get("link") ?? "").trim() || null,
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    duration: String(formData.get("period") ?? "").trim() || null,
    contact,
  });
  if (error) return { error: "신청에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  return { ok: true };
}
