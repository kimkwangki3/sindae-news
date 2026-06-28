"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createServiceClient } from "./supabase/server";
import { logAdmin } from "./audit";
import type {
  PostKind,
  PostVisibility,
  TipStatus,
  ApprovalKind,
  ApprovalStatus,
  ReporterLevel,
} from "./mock/admin-types";

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    throw new Error("권한이 없습니다.");
  }
  return user;
}

const TABLE: Record<PostKind, string> = {
  board: "board_posts",
  market: "market_posts",
};
const PATH: Record<PostKind, string> = {
  board: "/admin/board",
  market: "/admin/market",
};

// 게시판/나눔마켓 글 노출/숨김
export async function setPostVisibility(
  kind: PostKind,
  id: string,
  visibility: PostVisibility,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from(TABLE[kind]).update({ visibility }).eq("id", id);
  await logAdmin("set_post_visibility", {
    targetType: kind,
    targetId: id,
    memo: visibility,
  });
  revalidatePath(PATH[kind]);
}

// 상단 고정 토글(게시판 공지·나눔 상단)
export async function togglePostPin(
  kind: PostKind,
  id: string,
  pinned: boolean,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from(TABLE[kind]).update({ is_pinned: pinned }).eq("id", id);
  await logAdmin("toggle_post_pin", {
    targetType: kind,
    targetId: id,
    memo: String(pinned),
  });
  revalidatePath(PATH[kind]);
}

// 글 삭제
export async function deletePost(kind: PostKind, id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from(TABLE[kind]).delete().eq("id", id);
  await logAdmin("delete_post", { targetType: kind, targetId: id });
  revalidatePath(PATH[kind]);
}

// 나눔마켓 완료 처리
export async function setMarketDone(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("market_posts")
    .update({ category: "done" })
    .eq("id", id);
  await logAdmin("market_done", { targetType: "market", targetId: id });
  revalidatePath("/admin/market");
}

// 제보 상태 변경
export async function setTipStatus(
  id: string,
  status: TipStatus,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("tips").update({ status }).eq("id", id);
  await logAdmin("set_tip_status", {
    targetType: "tip",
    targetId: id,
    memo: status,
  });
  revalidatePath("/admin/tips");
}

// --- 상권/업체 · 지역단체 승인 ---
const ENTITY_TABLE: Record<ApprovalKind, string> = {
  business: "businesses",
  org: "organizations",
};
const ENTITY_PATH: Record<ApprovalKind, string> = {
  business: "/admin/business",
  org: "/admin/orgs",
};

// 업체/단체 승인·반려
export async function setEntityStatus(
  kind: ApprovalKind,
  id: string,
  status: ApprovalStatus,
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from(ENTITY_TABLE[kind])
    .update({ status, reviewed_by: admin.id })
    .eq("id", id);
  await logAdmin("set_entity_status", {
    targetType: kind,
    targetId: id,
    memo: status,
  });
  revalidatePath(ENTITY_PATH[kind]);
}

// 업체/단체 삭제
export async function deleteEntity(
  kind: ApprovalKind,
  id: string,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from(ENTITY_TABLE[kind]).delete().eq("id", id);
  await logAdmin("delete_entity", { targetType: kind, targetId: id });
  revalidatePath(ENTITY_PATH[kind]);
}

// 홍보글 승인·반려
export async function setPromoStatus(
  id: string,
  status: ApprovalStatus,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("promo_posts").update({ status }).eq("id", id);
  await logAdmin("set_promo_status", {
    targetType: "promo",
    targetId: id,
    memo: status,
  });
  revalidatePath("/admin/business");
}

// --- 기자 신청 승인/반려 ---
// 승인: 신청 status=approved + (연결된 user_id가 있으면) 해당 회원을 reporter+등급 지정
export async function approveReporterApp(
  appId: string,
  userId: string | null,
  level: ReporterLevel,
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("reporter_applications")
    .update({ status: "approved", reviewed_by: admin.id })
    .eq("id", appId);
  if (userId) {
    await supabase
      .from("profiles")
      .update({ role: "reporter", reporter_level: level })
      .eq("id", userId);
  }
  await logAdmin("approve_reporter_app", {
    targetType: "reporter_application",
    targetId: appId,
    memo: level,
  });
  revalidatePath("/admin/reporters");
}

export async function rejectReporterApp(appId: string): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("reporter_applications")
    .update({ status: "rejected", reviewed_by: admin.id })
    .eq("id", appId);
  await logAdmin("reject_reporter_app", {
    targetType: "reporter_application",
    targetId: appId,
  });
  revalidatePath("/admin/reporters");
}

// --- 정정보도 처리 ---
export async function setCorrectionStatus(
  id: string,
  status: ApprovalStatus,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("corrections").update({ status }).eq("id", id);
  await logAdmin("set_correction_status", {
    targetType: "correction",
    targetId: id,
    memo: status,
  });
  revalidatePath("/admin/corrections");
}

// --- 설정 ---
// 광고 슬롯 활성/비활성
export async function setSlotActive(
  id: number,
  active: boolean,
): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("ad_slots").update({ is_active: active }).eq("id", id);
  await logAdmin("set_slot_active", {
    targetType: "ad_slot",
    targetId: String(id),
    memo: String(active),
  });
  revalidatePath("/admin/settings");
}

// 법적 페이지 본문 저장(upsert)
export async function saveLegalPage(formData: FormData): Promise<void> {
  await assertAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  if (!slug) throw new Error("slug 누락");
  const supabase = createServiceClient();
  await supabase
    .from("legal_pages")
    .upsert(
      { slug, title, body, updated_at: new Date().toISOString() },
      { onConflict: "slug" },
    );
  await logAdmin("save_legal_page", { targetType: "legal", targetId: slug });
  revalidatePath("/admin/legal");
  revalidatePath(`/legal/${slug}`);
}
