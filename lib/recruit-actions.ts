"use server";

import { createClient } from "./supabase/server";
import { getCurrentUser } from "./auth";
import { getClientIp } from "./ip";
import { notify } from "./telegram";

export interface RecruitState {
  ok?: boolean;
  error?: string;
}

// 시민기자 신청 — 책임 서약 필수(법적 증빙). 서약 시점·IP를 함께 남긴다.
export async function submitReporterApplication(
  _prev: RecruitState,
  formData: FormData,
): Promise<RecruitState> {
  const name = String(formData.get("name") ?? "").trim();
  const signedName = String(formData.get("signed_name") ?? "").trim();
  const pledge = formData.get("pledge") === "on";

  if (name.length < 2) return { error: "이름을 입력해 주세요." };
  if (!pledge) return { error: "기자 책임 서약에 동의해 주세요." };
  if (signedName.length < 2) return { error: "서명(성명)을 입력해 주세요." };
  if (signedName !== name) {
    return { error: "서명은 이름과 동일하게 입력해 주세요." };
  }

  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  const interests = formData
    .getAll("interests")
    .map((v) => String(v))
    .filter(Boolean);

  const user = await getCurrentUser();
  const supabase = createClient();
  const { error } = await supabase.from("reporter_applications").insert({
    user_id: user?.id ?? null,
    name,
    phone: phone || null,
    email: email || null,
    neighborhood: neighborhood || null,
    interests: interests.length ? interests : null,
    motivation: motivation || null,
    pledge_agreed: true,
    signed_name: signedName,
    agreed_at: new Date().toISOString(),
    agreed_ip: getClientIp(),
  });
  if (error) {
    return { error: "신청에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  await notify({
    type: "reporter_application",
    name,
    phone,
    email,
    neighborhood,
    interests,
    motivation,
  });
  return { ok: true };
}
