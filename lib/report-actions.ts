"use server";

import type { ReportTarget } from "./report";

export interface ReportResult {
  ok: boolean;
  error?: string;
}

// 통합 신고 접수. 비로그인도 허용(schema: reporter_id nullable, reporter_ip 기록).
// 후속: reports insert(target_type, target_id, reason, detail, reporter_id, reporter_ip).
export async function submitReport(
  targetType: ReportTarget,
  targetId: string,
  reason: string,
  detail: string,
): Promise<ReportResult> {
  if (!reason) return { ok: false, error: "신고 사유를 선택해 주세요." };
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[report] ${targetType}:${targetId} · ${reason} · ${detail}`);
  }
  return { ok: true };
}
