import { notFound } from "next/navigation";
import Link from "next/link";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import ArticleListItem from "@/components/ArticleListItem";
import ReactionBar from "@/components/article/ReactionBar";
import Comments from "@/components/article/Comments";
import ReadTracker from "@/components/article/ReadTracker";
import ReportSheet from "@/components/ReportSheet";
import ArticleAiNotice from "@/components/ArticleAiNotice";
import NewsArticleJsonLd from "@/components/article/NewsArticleJsonLd";
import { MEDIA } from "@/lib/media";
import { findStaffByName } from "@/lib/staff";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// "2026-07-31T08:33:20Z" → "2026.07.31"
function fmtDay(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}
import {
  CATEGORY_NAME,
  getArticleBySlug,
  getRelated,
} from "@/lib/mock/articles";
import { getComments } from "@/lib/mock/comments";
import { getCurrentUser } from "@/lib/auth";
import ShareButton from "@/components/ShareButton";

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

  // 바이라인이 등록된 필자면 프로필로 연결한다.
  const staff = findStaffByName(article.author);

  return (
    <article className="px-[18px] pb-10">
      <ReadTracker slug={article.slug} />
      <NewsArticleJsonLd
        slug={article.slug}
        headline={article.title}
        description={article.subtitle ?? article.body[0]?.slice(0, 150)}
        imageUrl={article.thumbnailUrl}
        publishedAtIso={article.publishedAtIso}
        updatedAtIso={article.updatedAtIso}
        author={article.author}
        section={CATEGORY_NAME[article.category]}
        siteUrl={SITE_URL}
      />
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
        {/* 신문법상 발행연월일은 인터넷신문의 경우 기사별 게재일자로 갈음한다.
            수정한 적이 있으면 최종수정일시도 함께 밝힌다(뉴스 신뢰 신호). */}
        <p className="mt-2 text-xs text-muted">
          {staff ? (
            <Link
              href={`/reporters/${staff.handle}`}
              className="font-bold text-ink underline"
            >
              {staff.name} {staff.title}
            </Link>
          ) : (
            article.author
          )}{" "}
          · 입력 {article.publishedAt}
          {article.updatedAtIso && (
            <> · 최종수정 {fmtDay(article.updatedAtIso)}</>
          )}{" "}
          · 조회 {article.views.month}
        </p>
      </div>

      {/* 대표 이미지가 있으면 실제 사진, 없으면 자리표시 */}
      {/* 대표 이미지 — alt는 제목만 넣지 말고 무엇을 담은 이미지인지 밝힌다.
          AI로 만든 이미지는 현장 사진으로 오인되지 않게 바로 아래 캡션을 단다. */}
      <figure className="mt-4">
        <Thumb
          src={article.thumbnailUrl}
          sizes="(max-width: 768px) 100vw, 720px"
          className="h-[210px] w-full"
          rounded="rounded-card"
          alt={`${article.title} 관련 이미지`}
        />
        {article.thumbnailUrl && article.aiImage && (
          <figcaption className="mt-1.5 text-[11px] text-muted">
            이미지: AI 생성 · 실제 현장 사진이 아닙니다
          </figcaption>
        )}
      </figure>

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

      {/* 공유 + 통합 신고 시트 */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <ShareButton
          title={article.title}
          text={article.subtitle ?? undefined}
          label="기사 공유"
        />
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
