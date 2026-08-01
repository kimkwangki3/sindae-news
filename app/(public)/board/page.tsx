import Link from "next/link";
import InfoBoardCard from "@/components/InfoBoardCard";
import AdSlot from "@/components/AdSlot";
import {
  getBoardPosts,
  BOARD_CAT_NAME,
  type BoardCategory,
} from "@/lib/mock/community";

export const metadata = { title: "자유게시판 · 해룡신문" };

type ChipKey = "all" | "popular" | "org" | BoardCategory;

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "popular", label: "🔥 인기" },
  { key: "org", label: "🏛 단체" },
  { key: "question", label: "질문" },
  { key: "daily", label: "일상" },
  { key: "local", label: "동네소식" },
];

const TAG_TONE: Record<string, string> = {
  notice: "bg-rose-soft text-rose",
  question: "bg-tag-biz-bg text-tag-biz-fg",
  daily: "bg-tag-org-bg text-tag-org-fg",
  local: "bg-line text-muted",
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const keys = CHIPS.map((c) => c.key);
  const cat = (
    keys.includes(searchParams.cat as ChipKey) ? searchParams.cat : "all"
  ) as ChipKey;
  const posts = await getBoardPosts(cat);

  return (
    <div>
      {/* 생활정보는 게시판 맨 위에 고정으로 노출한다(발행인 요청).
          공개된 항목이 없으면 아무것도 그리지 않는다. */}
      <InfoBoardCard />

      <div className="px-[18px]">
        <AdSlot slot="board-top" />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] py-3">
        {CHIPS.map((c) => {
          const active = c.key === cat;
          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/board" : `/board?cat=${c.key}`}
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
          href="/board/write"
          className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3.5 text-sm font-bold text-white"
        >
          ＋ 글쓰기
        </Link>
      </div>

      <ul className="flex flex-col px-[18px] pb-6 pt-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/board/${p.id}`}
              className="flex flex-col gap-1.5 border-t border-line py-3.5"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${
                    TAG_TONE[p.category] ?? "bg-line text-muted"
                  }`}
                >
                  {p.pinned && p.category === "notice" ? "📌 " : ""}
                  {BOARD_CAT_NAME[p.category]}
                </span>
                {/* 단체 명의 글이면 어느 단체인지 바로 보이게 */}
                {p.orgName && (
                  <span className="max-w-[45%] truncate rounded-full bg-tag-org-bg px-2 py-0.5 text-[13px] font-bold text-tag-org-fg">
                    🏛 {p.orgName}
                  </span>
                )}
                <h4 className="line-clamp-1 flex-1 text-[18px] font-bold">
                  {p.title}
                </h4>
              </div>
              <div className="flex gap-2.5 text-[14px] text-muted">
                <span>{p.author}</span>
                <span>👍 {p.likeCount}</span>
                <span>💬 {p.commentCount}</span>
                <span>👁 {p.viewCount.toLocaleString()}</span>
                <span className="ml-auto">{p.createdAt}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
