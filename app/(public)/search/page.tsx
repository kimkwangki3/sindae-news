import Link from "next/link";
import { searchAll } from "@/lib/mock/search";
import { getTopTags } from "@/lib/mock/articles";
import TagChips from "@/components/article/TagChips";

// 검색 결과는 색인할 이유가 없다. ?q= 하나마다 다른 주소가 생겨 사실상
// 무한한 중복 페이지가 되고, 크롤링 예산만 갉아먹는다. 링크는 따라가게 둔다.
export const metadata = {
  title: "검색 · 해룡신문",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  // 검색어가 없을 땐 빈 화면 대신 태그를 보여준다 — 뭘 검색해야 할지
  // 모르는 방문자에게 이 신문이 무슨 이야기를 다뤄왔는지가 곧 실마리다.
  const [groups, topTags] = await Promise.all([
    q ? searchAll(q) : Promise.resolve([]),
    q ? Promise.resolve([]) : getTopTags(16),
  ]);
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
        <div className="pt-8">
          <p className="text-center text-sm text-muted">
            찾고 싶은 단어를 입력해 보세요
          </p>
          {topTags.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-bold text-rose-deep">
                많이 다룬 주제
              </h2>
              <TagChips tags={topTags.map((t) => t.tag)} />
            </section>
          )}
        </div>
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
                      <span className="text-[16px] text-muted">{h.sub}</span>
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
