import { createServiceClient } from "./supabase/server";
import { getCurrentUser } from "./auth";

// 관리 행위 감사 로그. best-effort — 실패해도 관리 동작을 막지 않는다.
// (admin_audit_logs 테이블이 아직 없어도 조용히 무시)
export async function logAdmin(
  action: string,
  opts: { targetType?: string; targetId?: string; memo?: string } = {},
): Promise<void> {
  try {
    const user = await getCurrentUser(); // cache()로 요청당 1회만 조회
    const supabase = createServiceClient();
    await supabase.from("admin_audit_logs").insert({
      actor_id: user?.id ?? null,
      action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      memo: opts.memo ?? null,
    });
  } catch {
    // 감사 로그 실패는 무시(관리 동작 자체는 계속)
  }
}
