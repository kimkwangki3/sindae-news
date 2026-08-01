import Link from "next/link";
import { getInfoPages, fmtUpdated } from "@/lib/info";

export const metadata = {
  title: "생활정보 · 해룡신문",
  description:
    "해룡면 신대·복성·선월지구 생활정보 — 버스 시간표, 야간·휴일 병원과 약국, 재활용 배출 요일, 어린이집·학원, 민원 안내.",
};

// 검색으로 찾아오는 페이지다. 기사와 달리 시간이 지나도 값이 떨어지지 않으므로
// 색인이 잘 되도록 동적으로 두고 갱신을 바로 반영한다.
export const dynamic = "force-dynamic";

export default async function InfoPage() {
  const pages = await getInfoPages();

  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">생활정보</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        해룡면에 사는 데 필요한 것들을 모아 두고 계속 갱신합니다.
      </p>

      {pages.length === 0 ? (
        <p className="mt-8 rounded-card border border-line bg-ivory-2 p-5 text-center text-[18px] leading-relaxed text-muted">
          준비 중입니다.
          <br />
          버스 시간표·야간 약국·재활용 배출 요일부터 차례로 올립니다.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2.5">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/info/${p.slug}`}
                className="flex min-h-[72px] items-center gap-3.5 rounded-card border border-line bg-white px-4 py-3"
              >
                <span className="text-2xl" aria-hidden>
                  {p.icon ?? "📄"}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[20px] font-bold text-ink">{p.title}</span>
                  {p.summary && (
                    <span className="text-[17px] leading-relaxed text-muted">
                      {p.summary}
                    </span>
                  )}
                  <span className="text-[16px] text-muted">
                    {fmtUpdated(p.updatedAt)} 기준
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
