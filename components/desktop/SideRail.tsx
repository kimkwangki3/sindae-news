import Link from "next/link";
import type { ArticleSummary } from "@/components/ArticleListItem";
import type { MostRead } from "@/lib/frontpage-data";

export const RAIL_TITLE =
  "mb-2 border-b-2 border-ink pb-2 font-display text-[21px] font-black";

export function MostReadList({ items }: { items: MostRead[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className={RAIL_TITLE}>많이 본 기사</h2>
      <ol>
        {items.map((a, i) => (
          <li key={a.slug} className="border-b border-line">
            <Link
              href={`/article/${a.slug}`}
              className="grid min-h-[44px] grid-cols-[30px_1fr] py-2.5 text-[17px] leading-snug"
            >
              <span
                className="font-display text-[22px] font-black leading-none text-rose-deep"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="line-clamp-2 break-keep">{a.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// 기사·목록 화면의 곁단. PC에서만 보인다.
export default function SideRail({
  mostRead,
  latest,
}: {
  mostRead: MostRead[];
  latest: ArticleSummary[];
}) {
  return (
    <aside className="hidden min-w-0 flex-col gap-6 lg:flex">
      <MostReadList items={mostRead} />
      {latest.length > 0 && (
        <section>
          <h2 className={RAIL_TITLE}>최신 기사</h2>
          <ul>
            {latest.map((a) => (
              <li key={a.slug} className="border-b border-line">
                <Link
                  href={`/article/${a.slug}`}
                  className="flex min-h-[44px] items-center py-2.5 text-[17px] leading-snug"
                >
                  <span className="line-clamp-2 break-keep">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
