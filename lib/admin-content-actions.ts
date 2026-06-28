"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createServiceClient } from "./supabase/server";
import { logAdmin } from "./audit";
import type { PostKind, PostVisibility, TipStatus } from "./mock/admin-types";

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
