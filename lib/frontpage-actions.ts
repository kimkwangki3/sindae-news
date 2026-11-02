"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createServiceClient } from "./supabase/server";
import { logAdmin } from "./audit";
import { revalidatePublic } from "./revalidate";
import { planSlotRows, type FrontSelection } from "./frontpage";

// 편성 저장. 실패하면 화면에 그대로 보여줄 사유를 돌려준다.
export async function saveFrontPage(
  sel: FrontSelection,
): Promise<{ ok: boolean; reason?: string }> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return { ok: false, reason: "권한이 없습니다. 다시 로그인해 주세요." };
  }

  const ids = [sel.top, ...sel.subs].filter(Boolean) as string[];
  if (new Set(ids).size !== ids.length) {
    return { ok: false, reason: "같은 기사를 두 칸에 넣을 수 없습니다." };
  }
  if (sel.shortTitle.trim().length > 80) {
    return { ok: false, reason: "짧은 제목은 80자까지 쓸 수 있습니다." };
  }

  const supabase = createServiceClient();
  const { data: existing, error: readError } = await supabase
    .from("front_page_slots")
    .select("slot, article_id, expires_at");
  if (readError) {
    // eslint-disable-next-line no-console
    console.warn("[frontpage] 편성표 읽기 실패:", readError.message);
    return {
      ok: false,
      reason: "편성표를 읽지 못했습니다. front-page-migration.sql 실행 여부를 확인해 주세요.",
    };
  }

  const rows = planSlotRows(sel, existing ?? [], Date.now()).map((r) => ({
    ...r,
    set_by: user.id,
    set_at: new Date().toISOString(),
  }));

  const keep = rows.map((r) => r.slot);
  const del = supabase.from("front_page_slots").delete();
  const { error: delError } = keep.length
    ? await del.not("slot", "in", `(${keep.join(",")})`)
    : await del.neq("slot", "");
  const { error: saveError } = rows.length
    ? await supabase
        .from("front_page_slots")
        .upsert(rows, { onConflict: "slot" })
    : { error: null };

  const failed = delError ?? saveError;
  if (failed) {
    // eslint-disable-next-line no-console
    console.warn("[frontpage] 편성 저장 실패:", failed.message);
    return { ok: false, reason: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  await logAdmin("set_front_page", {
    targetType: "front_page",
    targetId: sel.top ?? "auto",
    // 정정 요청이 오면 당시 첫 화면 제목을 확인할 근거가 된다.
    memo: `서브 ${sel.subs.length}건${sel.pinned ? " · 고정" : ""}${
      sel.shortTitle.trim() ? ` · 짧은 제목: ${sel.shortTitle.trim()}` : ""
    }`,
  });
  revalidatePath("/admin/frontpage");
  revalidatePublic();
  return { ok: true };
}
