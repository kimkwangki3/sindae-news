"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createServiceClient } from "./supabase/server";
import { logAdmin } from "./audit";
import { CATEGORY_ID } from "./mock/articles-meta";
import type {
  ArticleStatus,
  CommentStatus,
  AdminRole,
  ReporterLevel,
} from "./mock/admin-types";

// 관리자 권한 가드 — 모든 액션 진입점에서 재확인(UI 가드와 이중).
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("권한이 없습니다.");
  }
  return user;
}

export async function setArticleStatus(
  slug: string,
  status: ArticleStatus,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = { status };
  // 발행으로 전환 시 발행일 보정
  if (status === "published") patch.published_at = new Date().toISOString();
  await supabase.from("articles").update(patch).eq("slug", slug);
  await logAdmin("set_article_status", { targetType: "article", targetId: slug, memo: status });
  revalidatePath("/admin/articles");
}

export async function deleteArticle(slug: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("articles").delete().eq("slug", slug);
  await logAdmin("delete_article", { targetType: "article", targetId: slug });
  revalidatePath("/admin/articles");
}

// 기사 저장(작성/편집). slug 충돌 시 upsert로 갱신.
export async function saveArticle(formData: FormData): Promise<void> {
  const user = await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const categorySlug = String(formData.get("category") ?? "local");
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as ArticleStatus;
  if (title.length < 2 || slug.length < 2) {
    throw new Error("제목과 슬러그를 입력해 주세요.");
  }

  const supabase = createServiceClient();
  const row: Record<string, unknown> = {
    slug,
    title,
    category_id:
      CATEGORY_ID[categorySlug as keyof typeof CATEGORY_ID] ?? null,
    body: body || null,
    author_id: user.id,
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  };
  const { error } = await supabase
    .from("articles")
    .upsert(row, { onConflict: "slug" });
  if (error) throw new Error("저장에 실패했습니다.");
  await logAdmin("save_article", { targetType: "article", targetId: slug, memo: status });
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}

// 준기자 pending 기사 게시 승인 — published + 검수 기록.
export async function approveArticle(slug: string): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("articles")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("slug", slug);
  await logAdmin("approve_article", { targetType: "article", targetId: slug });
  revalidatePath("/admin/articles");
}

// 반려 — 임시저장으로 되돌림(기자가 수정 후 재제출). 검수 기록.
export async function rejectArticle(slug: string): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("articles")
    .update({
      status: "draft",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("slug", slug);
  await logAdmin("reject_article", { targetType: "article", targetId: slug });
  revalidatePath("/admin/articles");
}

// 기자 등급 지정/변경(기자신청자/준기자/정기자)
export async function setReporterLevel(
  id: string,
  level: ReporterLevel,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("profiles").update({ reporter_level: level }).eq("id", id);
  await logAdmin("set_reporter_level", { targetType: "profile", targetId: id, memo: level });
  revalidatePath("/admin/members");
}

export async function setCommentStatus(
  id: string,
  status: CommentStatus,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  // CommentStatus(visible/reported/hidden) → DB visibility(visible/hidden)
  const visibility = status === "hidden" ? "hidden" : "visible";
  await supabase.from("comments").update({ visibility }).eq("id", id);
  await logAdmin("set_comment_status", { targetType: "comment", targetId: id, memo: visibility });
  revalidatePath("/admin/comments");
}

export async function deleteComment(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("comments").delete().eq("id", id);
  await logAdmin("delete_comment", { targetType: "comment", targetId: id });
  revalidatePath("/admin/comments");
}

export async function resolveReport(id: string): Promise<void> {
  const user = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("reports")
    .update({ status: "resolved", handled_by: user.id })
    .eq("id", id);
  await logAdmin("resolve_report", { targetType: "report", targetId: id });
  revalidatePath("/admin/reports");
}

export async function setMemberRole(
  id: string,
  role: AdminRole,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  await logAdmin("set_member_role", { targetType: "profile", targetId: id, memo: role });
  revalidatePath("/admin/members");
}

export async function setMemberSuspended(
  id: string,
  suspended: boolean,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("profiles")
    .update({ is_suspended: suspended })
    .eq("id", id);
  await logAdmin("set_member_suspended", { targetType: "profile", targetId: id, memo: String(suspended) });
  revalidatePath("/admin/members");
}

// --- 광고 ---
// 광고 신청 처리: resolved(승인/연락완료) / ignored(보류·거절)
export async function setAdRequestStatus(
  id: string,
  status: "resolved" | "ignored",
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("ad_requests").update({ status }).eq("id", id);
  await logAdmin("set_ad_request_status", { targetType: "ad_request", targetId: id, memo: status });
  revalidatePath("/admin/ads");
}

// 배너 광고 게재 등록 — 선택 슬롯에 활성 배너 추가.
export async function createAd(formData: FormData): Promise<void> {
  await assertAdmin();
  const slotId = Number(formData.get("slot_id"));
  const advertiser = String(formData.get("advertiser") ?? "").trim();
  if (!slotId || advertiser.length < 1) {
    throw new Error("슬롯과 광고주를 입력해 주세요.");
  }
  const supabase = createServiceClient();
  const { error } = await supabase.from("ads").insert({
    slot_id: slotId,
    advertiser,
    link_url: String(formData.get("link_url") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  });
  if (error) throw new Error("등록에 실패했습니다.");
  await logAdmin("create_ad", { targetType: "ad", memo: advertiser });
  revalidatePath("/admin/ads");
}

export async function toggleAd(id: string, active: boolean): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("ads").update({ is_active: active }).eq("id", id);
  await logAdmin("toggle_ad", { targetType: "ad", targetId: id, memo: String(active) });
  revalidatePath("/admin/ads");
}

export async function deleteAd(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("ads").delete().eq("id", id);
  await logAdmin("delete_ad", { targetType: "ad", targetId: id });
  revalidatePath("/admin/ads");
}
