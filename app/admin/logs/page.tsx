import { getAuditLogs } from "@/lib/mock/admin";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "감사 로그 · 관리자" };

export default async function AdminLogsPage() {
  const logs = await getAuditLogs();

  return (
    <div className="px-[18px] py-5">
      <PageHead title="감사 로그" sub={`최근 ${logs.length}건`} />

      <ul className="overflow-hidden rounded-card border border-line bg-white">
        {logs.map((l) => (
          <li
            key={l.id}
            className="border-t border-line px-3.5 py-2.5 text-sm first:border-t-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{l.actor}</span>
              <span className="text-[11px] text-muted">{l.createdAt}</span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              <span className="font-bold text-ink">{l.action}</span>
              {l.targetType && ` · ${l.targetType}`}
              {l.memo && ` · ${l.memo}`}
            </p>
          </li>
        ))}
        {logs.length === 0 && (
          <li className="px-3.5 py-10 text-center text-sm text-muted">
            기록이 없습니다. (admin_audit_logs 마이그레이션을 실행했는지
            확인하세요)
          </li>
        )}
      </ul>
    </div>
  );
}
