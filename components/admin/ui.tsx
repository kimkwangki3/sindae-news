import type { ReactNode } from "react";

// 관리자 공통 상태 뱃지. tone으로 색을 고른다.
export type PillTone = "ok" | "warn" | "muted";

const TONE: Record<PillTone, string> = {
  ok: "bg-tag-org-bg text-tag-org-fg",
  warn: "bg-tag-biz-bg text-tag-biz-fg",
  muted: "bg-line text-muted",
};

export function Pill({
  tone,
  children,
}: {
  tone: PillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

// 관리자 화면 상단 제목/부제 + 우측 액션 슬롯.
export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-xl text-rose-deep">{title}</h1>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
