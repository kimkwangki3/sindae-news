import { notFound } from "next/navigation";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import ArticleListItem from "@/components/ArticleListItem";
import ReactionBar from "@/components/article/ReactionBar";
import Comments from "@/components/article/Comments";
import ReadTracker from "@/components/article/ReadTracker";
import ReportSheet from "@/components/ReportSheet";
import {
  CATEGORY_NAME,
  getArticleBySlug,
  getRelated,
} from "@/lib/mock/articles";
import { getComments } from "@/lib/mock/comments";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const a = await getArticleBySlug(params.slug);
  return { title: a ? `${a.title} · 신대신문` : "기사 · 신대신문" };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const [user, comments, related] = await Promise.all([
    getCurrentUser(),
    getComments(article.slug),
    getRelated(article.slug),
  ]);

  return (
    <article className="px-[18px] pb-10">
      <ReadTracker slug={article.slug} />
      <div className="pt-4">
        <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold text-rose">
          {CATEGORY_NAME[article.category]}
        </span>
        <h1 className="mt-3 text-[22px] font-extrabold leading-snug">
          {article.title}
        </h1>
        <p className="mt-2 text-xs text-muted">
          {article.author} · {article.publishedAt} · 조회 {article.views.month}
        </p>
      </div>

      <Thumb
        className="mt-4 h-[210px] w-full"
        rounded="rounded-card"
        alt={article.title}
      />

      <div className="mt-5 flex flex-col gap-4 text-[15px] leading-[1.85]">
        {article.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <AdSlot slot="article-mid" />

      <ReactionBar
        slug={article.slug}
        likeCount={article.likeCount}
        dislikeCount={article.dislikeCount}
      />

      {/* 통합 신고 시트 */}
      <div className="flex justify-end">
        <ReportSheet
          targetType="article"
          targetId={article.slug}
          targetLabel={article.title}
          triggerLabel="기사 신고"
        />
      </div>

      <Comments
        slug={article.slug}
        initial={comments}
        isLoggedIn={user !== null}
      />

      {related.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1 text-base text-rose-deep">관련 기사</h3>
          {related.map((a) => (
            <ArticleListItem key={a.slug} article={a} />
          ))}
        </section>
      )}
    </article>
  );
}
