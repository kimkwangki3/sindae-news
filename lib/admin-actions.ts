"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createServiceClient } from "./supabase/server";
import { CATEGORY_ID } from "./mock/articles-meta";
import type {
  ArticleStatus,
  CommentStatus,
  AdminRole,
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
  revalidatePath("/admin/articles");
}

export async function deleteArticle(slug: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("articles").delete().eq("slug", slug);
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
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
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
  revalidatePath("/admin/comments");
}

export async function deleteComment(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("comments").delete().eq("id", id);
  revalidatePath("/admin/comments");
}

export async function resolveReport(id: string): Promise<void> {
  const user = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("reports")
    .update({ status: "resolved", handled_by: user.id })
    .eq("id", id);
  revalidatePath("/admin/reports");
}

export async function setMemberRole(
  id: string,
  role: AdminRole,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
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
  revalidatePath("/admin/members");
}
