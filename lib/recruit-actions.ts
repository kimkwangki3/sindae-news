"use server";

export interface RecruitState {
  ok?: boolean;
  error?: string;
}

// 시민기자 신청 — 책임 서약 필수(법적 증빙). 후속: reporter_applications insert
// (user_id, name, phone, email, interests, motivation, pledge_agreed, signed_name, agreed_at, agreed_ip).
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

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[recruit] reporter application: ${name}`);
  }
  return { ok: true };
}
