import { Fragment } from "react";
import Link from "next/link";
import CategoryNav from "@/components/CategoryNav";
import SiteJsonLd from "@/components/SiteJsonLd";
import AdSlot from "@/components/AdSlot";
import NetworkAd from "@/components/NetworkAd";
import ArticleListItem, {
  type ArticleSummary,
} from "@/components/ArticleListItem";
import { MostReadList } from "@/components/desktop/SideRail";
import {
  CategoryBlocks,
  LeadStory,
  LifeTiles,
  PhotoBand,
  SubStories,
  TownBand,
} from "@/components/home/FrontSections";
import TodayBand from "@/components/home/TodayBand";
import { MEDIA } from "@/lib/media";
import { LIVE_INFO_PAGES } from "@/lib/nav";
import { getTodaySummary } from "@/lib/localinfo-data";
import { getFeaturedSurvey } from "@/lib/mock/surveys";
import { remainingLabel } from "@/lib/surveys";
import { getArticlesPage } from "@/lib/mock/articles";
import type { CategorySlug } from "@/lib/mock/articles-meta";
import { getFrontPage, getMostRead } from "@/lib/frontpage-data";
import { getInfoPages } from "@/lib/info";
import { getBoardPosts } from "@/lib/mock/community";
import { getBusinesses } from "@/lib/mock/district";

// 제목·설명은 루트 레이아웃의 기본값을 그대로 쓴다. 여기서는 정규 주소만 밝힌다.
export const metadata = { alternates: { canonical: "/" } };

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h3 className="text-[22px] text-rose-deep">{title}</h3>
      <Link href={href} className="text-xs text-rose">
        더보기 ›
      </Link>
    </div>
  );
}

// 홈 휴대폰 목록의 기사 수. 톱 기사는 빼고 센다.
const HOME_LIST = 10;
const BLOCK_CATEGORIES: CategorySlug[] = ["local", "admin", "life"];
const BLOCK_SIZE = 4;

export default async function HomePage() {
  const [
    front,
    today,
    survey,
    mostRead,
    infoPages,
    posts,
    businesses,
    ...categories
  ] = await Promise.all([
      getFrontPage(),
      getTodaySummary(),
      getFeaturedSurvey(),
      getMostRead(),
      getInfoPages(),
      getBoardPosts("all"),
      getBusinesses("all"),
      ...BLOCK_CATEGORIES.map((c) => getArticlesPage(c, 0, BLOCK_SIZE + 4)),
    ]);

  const { lead, leadTitle, subs, rest } = front;
  const items: ArticleSummary[] = [...subs, ...rest].slice(0, HOME_LIST);

  // 톱·서브에 나온 기사는 아래 묶음에서 뺀다. 묶음의 첫 기사는 사진을 크게
  // 쓰므로, 사진 띠는 그 기사들을 피해 같은 사진이 두 번 나오지 않게 한다.
  const onTop = new Set([lead?.slug, ...subs.map((a) => a.slug)]);
  const blocks = BLOCK_CATEGORIES.map((slug, i) => ({
    slug,
    items: categories[i].items
      .filter((a) => !onTop.has(a.slug))
      .slice(0, BLOCK_SIZE),
  }));
  const blockLeads = new Set(blocks.map((b) => b.items[0]?.slug));
  const photos = rest
    // '사진'이라는 제목 아래 AI 그림을 놓으면 현장 사진으로 읽힌다.
    .filter((a) => a.thumbnailUrl && !a.aiImage && !blockLeads.has(a.slug))
    .slice(0, 4);

  return (
    <>
      {/* 검색 결과에 'sdtime.net' 대신 '해룡신문'이 뜨게 하는 구조화 데이터.
          구글은 홈페이지에서만 사이트 이름을 읽는다. */}
      <SiteJsonLd />
      {/* 화면의 제호는 그림과 링크라 문서 제목이 따로 필요하다. */}
      <h1 className="sr-only">{MEDIA.name} — 순천시 해룡면 지역 인터넷신문</h1>
      <CategoryNav />
      <div className="mx-auto max-w-[1240px]">
        <TodayBand today={today} />
      </div>

      <div className="px-[18px] pb-6 md:px-7 md:pt-6">
        {/* 태블릿 2단, PC 3단. 휴대폰은 위에서 아래로 쌓인다. */}
        <div className="md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)_288px]">
          {lead && (
            <LeadStory lead={lead} title={leadTitle ?? lead.title} />
          )}
          <SubStories items={subs} />
          <aside className="hidden min-w-0 flex-col gap-5 border-l border-line pl-6 lg:flex">
            <MostReadList items={mostRead} />
            <NetworkAd slot="home-list" viewport="desktop" />
            <AdSlot slot="home-top" placeholder />
          </aside>
        </div>

        {/* 휴대폰 지면 — 기존 구성 그대로 */}
        <div className="md:hidden">
          {/* 진행 중인 주민 의견 조사. 헤드라인 바로 아래에 둔다 — 마감이 있는
              일이라 아래로 내리면 끝난 뒤에 보게 된다. 없으면 자리도 없다. */}
          {survey && (
            <Link
              href={`/surveys/${survey.slug}`}
              className="mt-5 flex flex-col gap-1.5 rounded-card border border-rose bg-rose-soft p-4"
            >
              <span className="flex items-center gap-1.5 text-[16px] font-bold text-rose-deep">
                📊 주민 의견 조사
                {remainingLabel(survey.endsAt) && (
                  <span className="font-normal text-muted">
                    · {remainingLabel(survey.endsAt)}
                  </span>
                )}
              </span>
              <span className="text-[21px] font-bold leading-snug">
                {survey.title}
              </span>
              <span className="text-[17px] text-muted">
                참여 {survey.totalVotes.toLocaleString()}명 · 눌러서 참여하기
              </span>
            </Link>
          )}

          <AdSlot slot="home-top" placeholder />

          {/* 최신 기사 — 분류를 나누지 않고 올라온 순서대로.
              분류별 묶음은 상단 분류 메뉴와 /articles/[분류]에서 볼 수 있다. */}
          <section>
            <SectionTitle title="최신 기사" href="/articles" />
            {items.slice(0, 5).map((a, i) => (
              <Fragment key={a.slug}>
                <ArticleListItem article={a} />
                {/* 광고 — 네 번째 기사 뒤. 목록을 훑어내리다 한 번 멈치는 자리다.
                    바깥 div가 px-[18px]를 지고 있어 카드와 좌우 여백이 같다. */}
                {i === 3 && <NetworkAd slot="home-list" viewport="mobile" />}
              </Fragment>
            ))}
          </section>

          <AdSlot slot="home-mid" />

          <section>
            {items.slice(5).map((a) => (
              <ArticleListItem key={a.slug} article={a} />
            ))}
            {items.length >= HOME_LIST && (
              <Link
                href="/articles"
                className="mt-2 flex min-h-[48px] items-center justify-center rounded-card border border-line bg-white text-sm font-bold text-rose-deep"
              >
                기사 더 보기 ›
              </Link>
            )}
          </section>

          <AdSlot slot="home-bottom" />
        </div>

        {/* PC·태블릿 지면 */}
        <div className="hidden md:block">
          {/* PC는 곁단이 맡고, 곁단이 없는 태블릿만 여기에 둔다. */}
          <div className="lg:hidden">
            <AdSlot slot="home-top" placeholder />
          </div>
          <PhotoBand items={photos} />
          <CategoryBlocks blocks={blocks} />
          <AdSlot slot="home-mid" />
          <LifeTiles pages={[...LIVE_INFO_PAGES, ...infoPages]} />
          <TownBand
            survey={survey}
            posts={posts.slice(0, 3)}
            businesses={businesses.slice(0, 3)}
          />
          <AdSlot slot="home-bottom" />
        </div>

        {/* 신문법 제9조의2 — 청소년보호 정책·책임자는 첫 화면에 노출해야 한다 */}
        <Link
          href="/legal/youth"
          className="mt-6 flex min-h-[44px] items-center justify-between rounded-card border border-line bg-ivory-2 px-4 py-3 text-[17px] text-muted md:rounded-none"
        >
          <span>청소년보호정책 · 청소년보호책임자 {MEDIA.youthOfficer}</span>
          <span aria-hidden>›</span>
        </Link>
      </div>
    </>
  );
}
