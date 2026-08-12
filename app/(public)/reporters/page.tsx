import Link from "next/link";
import { STAFF } from "@/lib/staff";
import { MEDIA } from "@/lib/media";

export const metadata = {
  title: `필자 소개 · ${MEDIA.name}`,
  description: `${MEDIA.name} 편집부. 담당 분야와 연락처를 공개합니다.`,
  alternates: { canonical: "/reporters" },
};

// 필자 목록 — 기사 바이라인과 푸터에서 연결된다.
export default function ReportersPage() {
  return (
    <div className="px-[18px] py-5">
      <h1 className="text-xl text-rose-deep">필자 소개</h1>
      <p className="mt-1.5 text-[18px] leading-relaxed text-muted">
        해룡신문 기사를 쓰는 곳입니다. 취재 요청이나 정정 요청은 아래 이메일로
        바로 보내주셔도 됩니다.
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {STAFF.map((s) => (
          <li key={s.handle}>
            <Link
              href={`/reporters/${s.handle}`}
              className="flex min-h-[72px] items-center gap-3 rounded-card border border-line bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[20px] font-bold">
                  {s.name}
                  <span className="ml-1.5 text-[17px] font-normal text-muted">
                    {s.title}
                  </span>
                </p>
                <p className="mt-1 truncate text-[17px] text-muted">
                  {s.areas.join(" · ")}
                </p>
              </div>
              <span aria-hidden className="text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
