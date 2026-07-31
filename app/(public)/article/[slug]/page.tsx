import { notFound } from "next/navigation";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import ArticleListItem from "@/components/ArticleListItem";
import ReactionBar from "@/components/article/ReactionBar";
import Comments from "@/components/article/Comments";
import ReadTracker from "@/components/article/ReadTracker";
import ReportSheet from "@/components/ReportSheet";
import ArticleAiNotice from "@/components/ArticleAiNotice";
import { MEDIA } from "@/lib/media";
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
  if (!a) return { title: `기사 · ${MEDIA.name}` };

  // 부제가 있으면 검색·카톡 공유 미리보기 설명으로 쓴다(없으면 본문 첫 문단).
  const description = a.subtitle ?? a.body[0]?.slice(0, 150) ?? undefined;
  const title = `${a.title} · ${MEDIA.name}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
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
        {article.subtitle && (
          <p className="mt-2 border-l-[3px] border-rose-soft pl-3 text-[15px] leading-relaxed text-ink/80">
            {article.subtitle}
          </p>
        )}
        {/* 신문법상 발행연월일은 인터넷신문의 경우 기사별 게재일자로 갈음한다 */}
        <p className="mt-2 text-xs text-muted">
          {article.author} · 입력 {article.publishedAt} · 조회{" "}
          {article.views.month}
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

      <ArticleAiNotice
        aiText={article.aiText}
        aiImage={article.aiImage}
        sourceName={article.sourceName}
        sourceUrl={article.sourceUrl}
      />

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
