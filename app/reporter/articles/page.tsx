import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getMyArticles,
  ARTICLE_STATUS_LABEL,
  type MyArticleStatus,
} from "@/lib/mock/reporter";

export const metadata = { title: "내 기사 · 기자 공간" };

const FILTERS: { key: "all" | MyArticleStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "published", label: "발행" },
  { key: "pending", label: "승인대기" },
  { key: "draft", label: "임시저장" },
];

const STATUS_TONE: Record<MyArticleStatus, string> = {
  published: "bg-tag-org-bg text-tag-org-fg",
  pending: "bg-tag-biz-bg text-tag-biz-fg",
  draft: "bg-line text-muted",
  archived: "bg-line text-muted",
};

export default async function MyArticlesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const valid = FILTERS.map((f) => f.key);
  const status = (
    valid.includes(searchParams.status as MyArticleStatus)
      ? searchParams.status
      : "all"
  ) as "all" | MyArticleStatus;

  const rows = await getMyArticles(user.id, status);

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">내 기사</h1>
        <Link href="/reporter/write" className="text-xs font-bold text-rose-deep">
          ＋ 작성
        </Link>
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = f.key === status;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/reporter/articles" : `?status=${f.key}`}
              className={`flex min-h-[34px] items-center whitespace-nowrap rounded-full border px-3 text-sm ${
                active
                  ? "border-rose bg-rose text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((a) => (
          <li
            key={a.id}
            className="rounded-card border border-line bg-white p-3.5"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[a.status]}`}
              >
                {ARTICLE_STATUS_LABEL[a.status]}
              </span>
              <span className="text-[11px] text-muted">{a.category}</span>
              <span className="ml-auto text-[11px] text-muted">{a.date}</span>
            </div>
            <p className="mt-1.5 line-clamp-1 text-sm font-bold">{a.title}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted">
              <span>👁 {a.views}</span>
              <span>👍 {a.reactions}</span>
              <span>💬 {a.comments}</span>
              <Link
                href={`/reporter/articles/${a.id}/stats`}
                className="ml-auto font-bold text-rose"
              >
                통계 ›
              </Link>
              {a.status === "published" && (
                <Link href={`/article/${a.slug}`} className="text-rose">
                  보기 ›
                </Link>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">
            해당하는 기사가 없습니다
          </li>
        )}
      </ul>
    </div>
  );
}
