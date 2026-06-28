import Link from "next/link";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import {
  getMarketPosts,
  MARKET_CAT_NAME,
  type MarketCategory,
} from "@/lib/mock/community";

export const metadata = { title: "나눔마켓 · 신대신문" };

const CHIPS: { key: MarketCategory | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "share", label: "나눔" },
  { key: "request", label: "요청" },
  { key: "done", label: "완료" },
];

const TAG_TONE: Record<MarketCategory, string> = {
  share: "bg-tag-org-bg text-tag-org-fg",
  request: "bg-tag-biz-bg text-tag-biz-fg",
  done: "bg-line text-muted",
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const valid = CHIPS.map((c) => c.key);
  const cat = (
    valid.includes(searchParams.cat as MarketCategory)
      ? searchParams.cat
      : "all"
  ) as MarketCategory | "all";
  const posts = await getMarketPosts(cat);

  return (
    <div>
      {/* 카테고리 칩 */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] py-3">
        {CHIPS.map((c) => {
          const active = c.key === cat;
          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/market" : `/market?cat=${c.key}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[36px] items-center whitespace-nowrap rounded-full border px-3.5 text-sm ${
                active
                  ? "border-rose bg-rose text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="flex justify-end px-[18px]">
        <Link
          href="/market/write"
          className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3.5 text-sm font-bold text-white"
        >
          ＋ 글쓰기
        </Link>
      </div>

      <div className="flex flex-col gap-3 px-[18px] pb-6 pt-3">
        {posts.map((p, i) => (
          <div key={p.id}>
            <Link
              href={`/market/${p.id}`}
              className={`flex gap-3 rounded-card border border-line bg-white p-3 ${
                p.category === "done" ? "opacity-70" : ""
              }`}
            >
              <Thumb alt={p.title} className="h-[72px] w-[72px] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {p.pinned && (
                    <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[10px] font-bold text-rose">
                      📌 고정
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_TONE[p.category]}`}
                  >
                    {MARKET_CAT_NAME[p.category]}
                  </span>
                </div>
                <h4 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug">
                  {p.title}
                </h4>
                <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
                  <span>{p.neighborhood}</span>
                  <span>💬 {p.commentCount}</span>
                  <span>{p.createdAt}</span>
                </div>
              </div>
            </Link>

            {/* 3번째 글마다 인피드 광고 */}
            {(i + 1) % 3 === 0 && i < posts.length - 1 && (
              <AdSlot slot="market-infeed" variant="infeed" />
            )}
          </div>
        ))}

        {posts.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            아직 등록된 글이 없습니다
          </p>
        )}
      </div>
    </div>
  );
}
