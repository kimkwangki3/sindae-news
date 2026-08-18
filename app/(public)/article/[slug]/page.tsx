import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import NetworkAd from "@/components/NetworkAd";
import ArticleListItem from "@/components/ArticleListItem";
import ReactionBar from "@/components/article/ReactionBar";
import Comments from "@/components/article/Comments";
import ReadTracker from "@/components/article/ReadTracker";
import ReportSheet from "@/components/ReportSheet";
import ArticleAiNotice from "@/components/ArticleAiNotice";
import KakaoChannelCta from "@/components/KakaoChannelCta";
import NewsArticleJsonLd from "@/components/article/NewsArticleJsonLd";
import TagChips from "@/components/article/TagChips";
import ArticlePhoto from "@/components/article/ArticlePhoto";
import linkify from "@/components/Linkify";
import PostBody, { midAdAfterParagraph } from "@/components/PostBody";
import { kstDate } from "@/lib/datetime";
import { MEDIA } from "@/lib/media";
import { findStaffByName } from "@/lib/staff";

import {
  CATEGORY_NAME,
  getArticleBySlug,
  getRelated,
} from "@/lib/mock/articles";
import { getComments } from "@/lib/mock/comments";
import { getCurrentUser } from "@/lib/auth";
import ShareButton from "@/components/ShareButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// "2026-07-31T08:33:20Z" → "2026.07.31" (한국시각)
const fmtDay = kstDate;

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

  // 페이지가 openGraph를 정의하면 상위(layout)의 것을 통째로 대체한다.
  // 그래서 여기서 이미지를 직접 넣지 않으면 기사를 공유했을 때 그림이 빠진다.
  // 대표 이미지가 있으면 그걸, 없으면 신문 기본 이미지를 쓴다.
  const image = a.thumbnailUrl ?? "/og-image.png";

  return {
    title,
    description,
    // 이 기사의 정규 주소. metadataBase가 있어 상대경로가 절대 URL로 펴진다.
    // 없으면 구글이 기사를 홈의 중복으로 보고 색인에서 뺀다.
    alternates: { canonical: `/article/${a.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/article/${a.slug}`,
      images: [image],
      publishedTime: a.publishedAtIso ?? undefined,
      modifiedTime: a.updatedAtIso ?? undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
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

  // 예전 방식(body_format='text') 기사의 광고 자리. 블록 기사는 PostBody가
  // 안에서 직접 정하므로 여기서는 셀지 않는다.
  const midAdAt = article.bodyBlocks
    ? null
    : midAdAfterParagraph(article.body.length);

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
        tags={article.tags}
      />
      <div className="pt-4">
        <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[16px] font-bold text-rose">
          {CATEGORY_NAME[article.category]}
        </span>
        <h1 className="mt-3 text-[27px] font-extrabold leading-snug">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="mt-2 border-l-[3px] border-rose-soft pl-3 text-[20px] leading-relaxed text-ink/80">
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
        {article.thumbnailUrl ? (
          // 상세에서는 자르지 않는다 — 안내 포스터처럼 글자가 들어간 이미지는
          // 잘리면 정보가 사라진다. 탭하면 전체화면으로 원본을 볼 수 있다.
          <ArticlePhoto
            src={article.thumbnailUrl}
            alt={`${article.title} 관련 이미지`}
          />
        ) : (
          <Thumb
            src={null}
            className="h-[210px] w-full"
            rounded="rounded-card"
            alt=""
          />
        )}
        {article.thumbnailUrl && article.aiImage && (
          <figcaption className="mt-1.5 text-[16px] text-muted">
            이미지: AI 생성 · 실제 현장 사진이 아닙니다
          </figcaption>
        )}
      </figure>

      {/* 광고 ① 본문 시작 위. 제목·사진을 보고 본문으로 들어가는 길목이다. */}
      <NetworkAd slot="article-top" />

      {/* 본문 — 블록으로 저장된 기사만 새 경로로 그린다.
          예전 기사(body_format='text')는 아래 문단 반복 그대로다.
          광고 ②는 본문 안 네 칸 뒤에 들어간다. 짧은 글에는 들어가지 않는다. */}
      {article.bodyBlocks ? (
        <PostBody
          blocks={article.bodyBlocks}
          alt={`${article.title} 관련 사진`}
          className="mt-5"
          midAd={<NetworkAd slot="article-mid" />}
        />
      ) : (
        <div className="mt-5 flex min-w-0 flex-col gap-4 break-words text-[20px] leading-[1.85]">
          {article.body.map((p, i) => (
            <Fragment key={i}>
              <p>{linkify(p)}</p>
              {/* 자리를 정하는 규칙은 블록 본문(PostBody)과 같은 함수를
                  불러 쓴다. 예전에 여기만 기준이 7이고 저쪽은 6이라, 문단
                  여섯짜리 기사 7건이 조용히 광고를 못 받고 있었다. */}
              {midAdAt === i + 1 && <NetworkAd slot="article-mid" />}
            </Fragment>
          ))}
        </div>
      )}

      {/* 태그 — 본문 끝. 같은 화제의 기사로 넘어가는 통로 */}
      <TagChips tags={article.tags} className="mt-6" />

      <ArticleAiNotice
        aiText={article.aiText}
        aiImage={article.aiImage}
        sourceName={article.sourceName}
        sourceUrl={article.sourceUrl}
      />

      {/* 자체 배너 자리. 애드핏 자리표시(점선)와 나란히 놓이면 점선 상자가
          둘이 되어 화면이 어수선해진다 — 여기서는 팔린 배너가 있을 때만
          그린다(placeholder 를 뗐다). */}
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

      <KakaoChannelCta />

      <Comments
        slug={article.slug}
        initial={comments}
        isLoggedIn={user !== null}
      />

      {/* 광고 ③ 본문을 다 읽고 다음 글로 넘어가기 직전 — 관련 기사 위. */}
      <NetworkAd slot="article-bottom" />

      {related.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-1 text-base text-rose-deep">관련 기사</h3>
          {related.map((a) => (
            <ArticleListItem key={a.slug} article={a} />
          ))}
        </section>
      )}
      <AdSlot slot="article-bottom" />
    </article>
  );
}
