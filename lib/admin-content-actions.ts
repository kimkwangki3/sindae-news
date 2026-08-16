"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublic } from "./revalidate";
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
  revalidatePublic();
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
  revalidatePublic();
}

// 글 삭제
export async function deletePost(kind: PostKind, id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from(TABLE[kind]).delete().eq("id", id);
  await logAdmin("delete_post", { targetType: kind, targetId: id });
  revalidatePath(PATH[kind]);
  revalidatePublic();
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
  revalidatePublic();
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

// 제보 삭제 — 되돌릴 수 없다. 처리 이력은 감사로그에 남긴다.
export async function deleteTip(id: string): Promise<void> {
  await assertAdmin();
  const supabase = createServiceClient();
  await supabase.from("tips").delete().eq("id", id);
  await logAdmin("delete_tip", { targetType: "tip", targetId: id });
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
  revalidatePublic();
}

/**
 * 사업자등록 확인 기록 — 관리자만.
 *
 * 자동으로 검증하지 않는다. 사람이 국세청 조회 화면에서 번호를 대조하고 그
 * 결과를 여기에 남기는 것이다. 그래서 함수 이름도 '확인했다'이지 '검증한다'가
 * 아니다 — 배지가 뜻하는 바는 "해룡신문이 눈으로 확인했다"이다.
 *
 * 사장님이 스스로 이 값을 찍지 못하도록 DB 트리거가 따로 막는다
 * (db/business-verify-migration.sql).
 */
export async function setBusinessVerified(
  id: string,
  verified: boolean,
): Promise<void> {
  const admin = await assertAdmin();
  await createServiceClient()
    .from("businesses")
    .update({
      biz_verified_at: verified ? new Date().toISOString() : null,
      biz_verified_by: verified ? admin.id : null,
    })
    .eq("id", id);
  await logAdmin("set_business_verified", {
    targetType: "business",
    targetId: id,
    memo: verified ? "확인" : "확인 취소",
  });
  revalidatePath("/admin/business");
  revalidatePublic();
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
  revalidatePublic();
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
  revalidatePublic();
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

// 생활정보 저장. 내용을 채운 뒤 '공개'를 켜야 독자에게 보인다 —
// 빈 페이지가 노출되지 않게 하려는 것이다.
export async function saveInfoPage(formData: FormData): Promise<void> {
  await assertAdmin();
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) throw new Error("slug 누락");
  const body = String(formData.get("body") ?? "");
  const published = formData.get("is_published") === "on";
  if (published && body.trim().length < 10) {
    throw new Error("내용을 채운 뒤에 공개할 수 있습니다.");
  }

  // 이미지를 새로 올리지 않았으면 기존 것을 유지한다. 빈 값으로 덮으면
  // 글자만 고치려던 사람이 이미지를 날리게 된다.
  const uploaded = String(formData.get("image_url") ?? "").trim();
  const image = uploaded ? { image_url: uploaded } : {};

  await createServiceClient()
    .from("info_pages")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim() || null,
      body,
      ...image,
      source_name: String(formData.get("source_name") ?? "").trim() || null,
      source_url: String(formData.get("source_url") ?? "").trim() || null,
      is_published: published,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);

  await logAdmin("save_info_page", { targetType: "info", targetId: slug });
  revalidatePath("/admin/info");
  revalidatePath("/info");
  revalidatePath(`/info/${slug}`);
  revalidatePath("/board");
}
