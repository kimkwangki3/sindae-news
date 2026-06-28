import Link from "next/link";
import { searchAll } from "@/lib/mock/search";

export const metadata = { title: "검색 · 신대신문" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const groups = q ? await searchAll(q) : [];
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <div className="px-[18px] py-4">
      {/* 검색 입력 (GET) */}
      <form action="/search" method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="기사·나눔·게시판·상권·단체 검색"
          className="min-h-[48px] flex-1 rounded-element border border-line bg-white px-3.5 text-sm outline-none focus:border-rose"
        />
        <button
          type="submit"
          className="min-h-[48px] rounded-element bg-rose-deep px-4 text-sm font-bold text-white"
        >
          검색
        </button>
      </form>

      {/* 결과 */}
      {q === "" ? (
        <p className="py-16 text-center text-sm text-muted">
          찾고 싶은 단어를 입력해 보세요
        </p>
      ) : total === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          ‘{q}’ 검색 결과가 없습니다
        </p>
      ) : (
        <div className="pt-4">
          <p className="mb-3 text-xs text-muted">
            ‘<span className="font-bold text-ink">{q}</span>’ 검색 결과 {total}건
          </p>
          {groups.map((g) => (
            <section key={g.key} className="mb-6">
              <h2 className="mb-1 text-sm font-bold text-rose-deep">
                {g.label}{" "}
                <span className="font-normal text-muted">{g.hits.length}</span>
              </h2>
              <ul className="overflow-hidden rounded-card border border-line bg-white">
                {g.hits.map((h) => (
                  <li key={h.href}>
                    <Link
                      href={h.href}
                      className="flex flex-col gap-0.5 border-t border-line px-4 py-3 first:border-t-0"
                    >
                      <span className="line-clamp-1 text-sm font-bold">
                        {h.title}
                      </span>
                      <span className="text-[11px] text-muted">{h.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
