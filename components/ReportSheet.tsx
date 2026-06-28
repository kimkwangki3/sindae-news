"use client";

import { useState, useTransition } from "react";
import { submitReport } from "@/lib/report-actions";
import {
  REPORT_REASONS,
  REPORT_TARGET_LABEL,
  type ReportTarget,
} from "@/lib/report";

// 공통 신고 시트. 기사·댓글·나눔글·게시글 등 어디서든 동일한 방식으로 신고.
export default function ReportSheet({
  targetType,
  targetId,
  targetLabel,
  triggerClassName = "text-xs text-muted underline",
  triggerLabel = "🚩 신고",
}: {
  targetType: ReportTarget;
  targetId: string;
  targetLabel?: string;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    // 닫힘 애니메이션 없이 즉시 초기화
    setReason(null);
    setDetail("");
    setDone(false);
    setError(null);
  }

  function submit() {
    if (!reason) {
      setError("신고 사유를 선택해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitReport(targetType, targetId, reason, detail);
      if (res.ok) setDone(true);
      else setError(res.error ?? "신고 접수에 실패했어요.");
    });
  }

  const typeName = REPORT_TARGET_LABEL[targetType] ?? "콘텐츠";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative z-10 w-full max-w-app rounded-t-card bg-white p-5 pb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-rose-deep">신고하기</h2>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="min-h-[44px] px-2 text-lg text-muted"
              >
                ✕
              </button>
            </div>

            {done ? (
              <div className="py-6 text-center">
                <p className="text-sm">신고가 접수되었어요. 감사합니다.</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 min-h-[48px] w-full rounded-element bg-rose-deep text-sm font-bold text-white"
                >
                  확인
                </button>
              </div>
            ) : (
              <>
                <p className="mb-1 text-[13px]">
                  신고 대상: <b>{typeName}</b>
                  {targetLabel && (
                    <span className="text-muted"> · “{targetLabel}”</span>
                  )}
                </p>
                <p className="mb-4 text-[11px] text-muted">
                  기사·댓글·나눔글·게시글 모두 같은 방식으로 신고합니다.
                </p>

                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-1 text-[13px] font-bold">
                    신고 사유
                  </legend>
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex min-h-[44px] cursor-pointer items-center justify-between rounded-element border px-3.5 text-sm ${
                        reason === r.value
                          ? "border-rose bg-rose-soft text-rose-deep"
                          : "border-line bg-white"
                      }`}
                    >
                      {r.label}
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="sr-only"
                      />
                      <span aria-hidden>{reason === r.value ? "●" : "○"}</span>
                    </label>
                  ))}
                </fieldset>

                <label
                  htmlFor="report-detail"
                  className="mt-4 block text-[13px] font-bold"
                >
                  상세 내용 <span className="font-normal text-muted">(선택)</span>
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  placeholder="신고 사유를 자세히 적어주세요"
                  className="mt-1.5 w-full resize-none rounded-element border border-line bg-white p-3 text-sm outline-none focus:border-rose"
                />

                {error && <p className="mt-2 text-xs text-rose">{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="mt-4 min-h-[52px] w-full rounded-element bg-rose text-sm font-bold text-white disabled:opacity-50"
                >
                  {pending ? "접수 중…" : "신고 접수"}
                </button>
                <p className="mt-2 text-center text-[11px] text-muted">
                  허위·반복 신고 시 이용이 제한될 수 있습니다.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
