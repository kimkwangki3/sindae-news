"use server";

import { createClient } from "./supabase/server";
import { getCurrentUser } from "./auth";
import { getClientIp } from "./ip";
import { notify } from "./telegram";
import { REPORT_REASONS, type ReportTarget } from "./report";

export interface ReportResult {
  ok: boolean;
  error?: string;
}

// 통합 신고 접수. 비로그인도 허용(schema: reporter_id nullable, reporter_ip 기록).
export async function submitReport(
  targetType: ReportTarget,
  targetId: string,
  reason: string,
  detail: string,
): Promise<ReportResult> {
  if (!reason) return { ok: false, error: "신고 사유를 선택해 주세요." };

  const user = await getCurrentUser();
  const supabase = createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reason,
    detail: detail.trim() || null,
    reporter_id: user?.id ?? null,
    reporter_ip: getClientIp(),
  });
  if (error) {
    return { ok: false, error: "신고 접수에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  await notify({
    type: "report",
    target: targetType,
    targetId,
    reasonLabel: REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason,
    detail,
  });
  return { ok: true };
}
