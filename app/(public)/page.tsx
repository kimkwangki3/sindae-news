import Link from "next/link";
import Image from "next/image";
import CategoryNav from "@/components/CategoryNav";
import SiteJsonLd from "@/components/SiteJsonLd";
import AdSlot from "@/components/AdSlot";
import Thumb from "@/components/Thumb";
import ArticleListItem from "@/components/ArticleListItem";
import { MEDIA } from "@/lib/media";
import {
  CATEGORY_NAME,
  getArticlesPage,
  getLead,
} from "@/lib/mock/articles";

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

// 홈에 보여줄 최신 기사 수. 헤드라인 1건을 빼야 하므로 하나 더 받아온다.
const HOME_LIST = 10;

export default async function HomePage() {
  const [lead, latest] = await Promise.all([
    getLead(),
    // 분류를 가리지 않고 발행 최신순. 홈은 "지금 무슨 일이 있었나"를 보는
    // 자리라 분류별로 나눠 놓으면 정작 방금 올라온 기사가 아래로 밀린다.
    getArticlesPage(null, 0, HOME_LIST + 1),
  ]);

  // 헤드라인으로 크게 띄운 기사가 바로 아래 목록에 또 나오면 같은 기사를
  // 두 번 읽게 된다.
  const items = latest.items
    .filter((a) => a.slug !== lead?.slug)
    .slice(0, HOME_LIST);

  return (
    <>
      {/* 검색 결과에 'sdtime.net' 대신 '해룡신문'이 뜨게 하는 구조화 데이터.
          구글은 홈페이지에서만 사이트 이름을 읽는다. */}
      <SiteJsonLd />
      <CategoryNav />

      <div className="px-[18px] pb-6">
        {/* 오늘의 헤드라인 */}
        {lead && (
          <section className="pt-[18px]">
            <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[16px] font-bold tracking-wide text-rose">
              오늘의 헤드라인
            </span>
            <Link href={`/article/${lead.slug}`} className="mt-3.5 block">
              {/* 헤드라인 사진은 자르지 않는다 — 안내 포스터처럼 글자가 들어간
                  이미지를 200px 상자에 맞춰 잘라내면 정작 읽어야 할 날짜·장소가
                  사라진다. 기사 상세와 같은 기준이다.
                  화면 맨 위라 미리 받아야 첫 화면이 늦지 않는다(priority).
                  width/height는 자리를 미리 잡기 위한 값이고, 로드된 뒤에는
                  h-auto가 실제 비율을 따라가므로 어떤 비율이든 잘리지 않는다. */}
              {lead.thumbnailUrl ? (
                <Image
                  src={lead.thumbnailUrl}
                  alt={lead.title}
                  width={1448}
                  height={1086}
                  sizes="(max-width: 768px) 100vw, 720px"
                  priority
                  className="h-auto w-full rounded-card"
                />
              ) : (
                <Thumb
                  src={null}
                  className="h-[200px] w-full"
                  rounded="rounded-card"
                  alt=""
                />
              )}
              <h2 className="mt-3.5 text-[28px] font-extrabold leading-snug">
                {lead.title}
              </h2>
              <p className="mt-2 text-xs text-muted">
                {CATEGORY_NAME[lead.category]} · {lead.publishedAt} ·{" "}
                {lead.author}
              </p>
            </Link>
          </section>
        )}

        <AdSlot slot="home-top" placeholder />

        {/* 최신 기사 — 분류를 나누지 않고 올라온 순서대로.
            분류별 묶음은 상단 분류 메뉴와 /articles/[분류]에서 볼 수 있다. */}
        <section>
          <SectionTitle title="최신 기사" href="/articles" />
          {items.slice(0, 5).map((a) => (
            <ArticleListItem key={a.slug} article={a} />
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

        {/* 신문법 제21조 단서 — 청소년보호 정책·책임자는 첫 화면에 노출해야 한다 */}
        <Link
          href="/legal/youth"
          className="flex min-h-[44px] items-center justify-between rounded-card border border-line bg-ivory-2 px-4 py-3 text-[17px] text-muted"
        >
          <span>청소년보호정책 · 청소년보호책임자 {MEDIA.youthOfficer}</span>
          <span aria-hidden>›</span>
        </Link>
      </div>
    </>
  );
}
