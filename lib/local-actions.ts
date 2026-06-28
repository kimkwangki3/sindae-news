"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { can } from "./permissions";
import { createClient } from "./supabase/server";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.is_suspended) throw new Error("정지된 계정은 이용할 수 없습니다.");
  return user;
}

// --- 업체 ----------------------------------------------------------
// 업체 등록 신청 — 로그인 필수, 1인 1개. businesses insert(status=pending → 관리자 승인).
export async function registerBusiness(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("업체명을 입력해 주세요.");

  const supabase = createClient();
  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    category: String(formData.get("category") ?? "food"),
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    biz_reg_no: String(formData.get("biz_reg_no") ?? "").trim() || null,
    kakao_channel: String(formData.get("kakao_channel") ?? "").trim() || null,
    hours_open: String(formData.get("hours_open") ?? "") || null,
    hours_close: String(formData.get("hours_close") ?? "") || null,
    is_24h: formData.get("is_24h") === "on",
    intro: String(formData.get("intro") ?? "").trim() || null,
  });
  if (error) {
    throw new Error(
      "등록에 실패했습니다. 이미 등록한 업체가 있는지 확인해 주세요.",
    );
  }
  redirect("/district");
}

// 홍보 글쓰기 — 승인된 본인 업체만. promo_posts insert(status=pending).
export async function writePromo(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!can(user, "write_promo")) {
    throw new Error("승인된 업체만 홍보 글을 작성할 수 있습니다.");
  }
  const businessId = user.business?.id ?? "";
  if (!businessId) throw new Error("업체 정보를 찾을 수 없습니다.");
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  const supabase = createClient();
  const { error } = await supabase.from("promo_posts").insert({
    business_id: businessId,
    author_id: user.id,
    title,
    category: String(formData.get("category") ?? "") || null,
    body: String(formData.get("body") ?? "").trim() || null,
  });
  if (error) throw new Error("등록에 실패했습니다.");
  revalidatePath(`/district/${businessId}`);
  redirect(`/district/${businessId}`);
}

// --- 단체 ----------------------------------------------------------
// 단체 등록 신청 — 로그인 필수. organizations insert(status=pending) + 본인 owner 멤버십.
export async function registerOrg(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("단체명을 입력해 주세요.");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name,
      category: String(formData.get("category") ?? "self"),
      leader: String(formData.get("leader") ?? "").trim() || null,
      region: String(formData.get("region") ?? "").trim() || null,
      contact: String(formData.get("contact") ?? "").trim() || null,
      kakao_channel: String(formData.get("kakao_channel") ?? "").trim() || null,
      accept_join: formData.get("accept_join") === "on",
      intro: String(formData.get("intro") ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("등록에 실패했습니다.");

  // 등록자는 owner(approved)로 멤버 등록
  await supabase.from("org_members").insert({
    org_id: (data as { id: string }).id,
    user_id: user.id,
    role: "owner",
    status: "approved",
    apply_name: user.nickname ?? null,
  });
  redirect("/orgs");
}

export interface JoinState {
  ok?: boolean;
  error?: string;
}

// 단체 가입 신청 — 로그인 필수. org_members insert(status=pending). orgId는 bind 선주입.
export async function joinOrg(
  orgId: string,
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "이름을 입력해 주세요." };
  if (formData.get("agree") !== "on") {
    return { error: "개인정보 제공에 동의해 주세요." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("org_members").insert({
    org_id: orgId,
    user_id: user.id,
    role: "member",
    status: "pending",
    apply_name: name,
    apply_phone: String(formData.get("phone") ?? "").trim() || null,
    neighborhood: String(formData.get("neighborhood") ?? "").trim() || null,
    motivation: String(formData.get("motivation") ?? "").trim() || null,
  });
  if (error) {
    return { error: "이미 신청했거나 가입된 단체입니다." };
  }
  return { ok: true };
}

// 단체 소식 글쓰기 — 해당 단체 운영진만. org_posts insert.
export async function writeOrgPost(
  orgId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "write_org_post", { orgId })) {
    throw new Error("단체 운영진만 소식을 작성할 수 있습니다.");
  }
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) throw new Error("제목을 입력해 주세요.");

  const supabase = createClient();
  const { error } = await supabase.from("org_posts").insert({
    org_id: orgId,
    author_id: user.id,
    title,
    category: String(formData.get("category") ?? "") || null,
    body: String(formData.get("body") ?? "").trim() || null,
  });
  if (error) throw new Error("등록에 실패했습니다.");
  revalidatePath(`/orgs/${orgId}`);
  redirect(`/orgs/${orgId}`);
}

// 가입 신청 승인/거절 — 운영진만. org_members update(status).
export async function decideMember(
  orgId: string,
  memberId: string,
  decision: "approved" | "rejected",
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "approve_member", { orgId })) {
    throw new Error("권한이 없습니다.");
  }
  const supabase = createClient();
  await supabase
    .from("org_members")
    .update({ status: decision })
    .eq("id", Number(memberId))
    .eq("org_id", orgId);
  revalidatePath(`/orgs/${orgId}/manage`);
}

// 회원 내보내기 — 운영진만. org_members delete.
export async function removeMember(
  orgId: string,
  memberId: string,
): Promise<void> {
  const user = await requireUser();
  if (!can(user, "approve_member", { orgId })) {
    throw new Error("권한이 없습니다.");
  }
  const supabase = createClient();
  await supabase
    .from("org_members")
    .delete()
    .eq("id", Number(memberId))
    .eq("org_id", orgId);
  revalidatePath(`/orgs/${orgId}/manage`);
}
