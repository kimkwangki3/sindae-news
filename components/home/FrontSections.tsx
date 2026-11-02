import Link from "next/link";
import Image from "next/image";
import Thumb from "@/components/Thumb";
import type { ArticleSummary } from "@/components/ArticleListItem";
import type { FrontArticle } from "@/lib/frontpage-data";
import type { InfoPage } from "@/lib/info";
import type { BoardPost } from "@/lib/mock/community";
import type { Business } from "@/lib/mock/district";
import { CATEGORY_NAME, type CategorySlug } from "@/lib/mock/articles-meta";
import { remainingLabel, type SurveySummary } from "@/lib/surveys";

const BAND = "mt-8 border-t-[3px] border-ink pt-3";
const BAND_TITLE = "mb-3 font-display text-[24px] font-black";

// 사진을 크게 쓰는 자리의 출처 표시. AI 그림이 현장 사진으로 읽히면 안 된다.
function ImageNote({ article }: { article: ArticleSummary }) {
  if (!article.thumbnailUrl) return null;
  if (!article.aiImage && !article.imageCredit) return null;
  return (
    <p className="mt-1 text-[14px] text-muted">
      {article.aiImage ? "이미지: AI 생성" : article.imageCredit}
    </p>
  );
}

// 톱 기사. 휴대폰과 PC가 같은 HTML을 쓰고 글자 크기만 달라진다.
export function LeadStory({
  lead,
  title,
}: {
  lead: FrontArticle;
  title: string;
}) {
  return (
    <section className="min-w-0 pt-[18px] md:pt-0">
      <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[16px] font-bold tracking-wide text-rose md:hidden">
        오늘의 헤드라인
      </span>
      <Link href={`/article/${lead.slug}`} className="mt-3.5 block md:mt-0">
        {/* 헤드라인 사진은 자르지 않는다 — 안내 포스터처럼 글자가 들어간
            이미지를 잘라내면 정작 읽어야 할 날짜·장소가 사라진다. PC에서는
            세로 포스터가 화면을 다 차지하지 않게 높이만 막고 비율은 지킨다.
            화면 맨 위라 미리 받아야 첫 화면이 늦지 않는다(priority).
            width/height는 자리를 미리 잡기 위한 값이다. */}
        {lead.thumbnailUrl ? (
          <Image
            src={lead.thumbnailUrl}
            alt={lead.title}
            width={1448}
            height={1086}
            sizes="(max-width: 768px) 100vw, 680px"
            priority
            className="h-auto w-full rounded-card md:max-h-[460px] md:rounded-none md:bg-ivory-2 md:object-contain"
          />
        ) : (
          <Thumb
            src={null}
            className="h-[200px] w-full md:hidden"
            rounded="rounded-card"
            alt=""
          />
        )}
        {/* 헤드라인은 사진을 가장 크게 쓰는 자리라 여기서도 출처를 밝힌다.
            링크 안이라 원문 링크는 기사 상세에 둔다. */}
        <ImageNote article={lead} />
        <p className="mt-3 hidden text-[16px] font-bold text-rose-deep md:block">
          {lead.category}
        </p>
        <h2 className="mt-3.5 font-display text-[28px] font-extrabold leading-snug md:mt-1 md:break-keep md:text-[34px] md:font-black md:leading-[1.26] lg:text-[42px]">
          {title}
        </h2>
        {lead.subtitle && (
          <p className="mt-2 hidden break-keep font-display text-[20px] leading-normal text-ink/80 md:block">
            {lead.subtitle}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          {lead.category} · {lead.date} · {lead.author}
        </p>
      </Link>
    </section>
  );
}

// 서브 기사 3건. 첫 번째만 사진을 크게 쓴다.
export function SubStories({ items }: { items: FrontArticle[] }) {
  return (
    <section
      aria-label="주요 기사"
      className="hidden min-w-0 md:block md:border-l md:border-line md:pl-6"
    >
      {items.map((a, i) => (
        <Link
          key={a.slug}
          href={`/article/${a.slug}`}
          className={`block py-3.5 ${
            i === 0 ? "pt-0" : "border-t border-line"
          }`}
        >
          {i === 0 && a.thumbnailUrl && (
            <Thumb
              src={a.thumbnailUrl}
              alt={a.title}
              className="aspect-video w-full"
              rounded="rounded-none"
              sizes="360px"
            />
          )}
          {i === 0 && (
            <div className="mb-2.5">
              <ImageNote article={a} />
            </div>
          )}
          <span className="text-[16px] font-bold text-rose-deep">
            {a.category}
          </span>
          <h3 className="mt-0.5 break-keep font-display text-[23px] font-bold leading-[1.34]">
            {a.title}
          </h3>
          {a.subtitle && (
            <p className="mt-1 line-clamp-2 text-[17px] leading-snug text-ink/75">
              {a.subtitle}
            </p>
          )}
          <p className="mt-1 text-[15px] text-muted">{a.date}</p>
        </Link>
      ))}
    </section>
  );
}

export function PhotoBand({ items }: { items: ArticleSummary[] }) {
  if (items.length < 4) return null;
  return (
    <section className={BAND}>
      <h2 className={BAND_TITLE}>사진으로 보는 해룡</h2>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {items.slice(0, 4).map((a) => (
          <Link key={a.slug} href={`/article/${a.slug}`} className="block min-w-0">
            <Thumb
              src={a.thumbnailUrl}
              alt={a.title}
              className="aspect-[4/3] w-full"
              rounded="rounded-none"
              sizes="(max-width: 1024px) 50vw, 290px"
            />
            <ImageNote article={a} />
            <h3 className="mt-2 line-clamp-2 font-display text-[18px] font-bold leading-snug">
              {a.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryBlocks({
  blocks,
}: {
  blocks: { slug: CategorySlug; items: ArticleSummary[] }[];
}) {
  const shown = blocks.filter((b) => b.items.length > 0);
  if (shown.length === 0) return null;
  return (
    <div className="mt-8 grid gap-6 border-t-[3px] border-double border-ink pt-5 lg:grid-cols-3">
      {shown.map((b) => (
        <section key={b.slug} className="min-w-0">
          <h2 className="mb-2 flex items-baseline justify-between border-b-2 border-ink pb-2 font-display text-[21px] font-black">
            {CATEGORY_NAME[b.slug]}
            <Link
              href={`/articles/${b.slug}`}
              className="font-sans text-[16px] font-normal text-muted"
            >
              더보기
            </Link>
          </h2>
          {b.items.map((a, i) => (
            <Link
              key={a.slug}
              href={`/article/${a.slug}`}
              className="block border-b border-line py-2.5 last:border-b-0"
            >
              {i === 0 && a.thumbnailUrl && (
                <Thumb
                  src={a.thumbnailUrl}
                  alt={a.title}
                  className="aspect-video w-full"
                  rounded="rounded-none"
                  sizes="(max-width: 1024px) 100vw, 380px"
                />
              )}
              {i === 0 && (
                <div className="mb-2">
                  <ImageNote article={a} />
                </div>
              )}
              <h3 className="line-clamp-2 font-display text-[18px] font-bold leading-snug">
                {a.title}
              </h3>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}

export function LifeTiles({ pages }: { pages: InfoPage[] }) {
  if (pages.length === 0) return null;
  return (
    <section className={BAND}>
      <h2 className={`${BAND_TITLE} flex items-baseline justify-between`}>
        해룡면 생활정보
        <Link href="/info" className="font-sans text-[16px] font-normal text-muted">
          전체 보기
        </Link>
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/info/${p.slug}`}
            className="block min-w-0 border border-line bg-white p-3.5"
          >
            <h3 className="font-display text-[19px] font-bold leading-snug">
              {p.title}
            </h3>
            {p.summary && (
              <p className="mt-1 line-clamp-2 text-[16px] leading-snug text-muted">
                {p.summary}
              </p>
            )}
          </Link>
        ))}
        <Link
          href="/haeryong"
          className="block min-w-0 border border-rose-deep bg-rose-soft p-3.5"
        >
          <h3 className="font-display text-[19px] font-bold leading-snug text-rose-deep">
            해룡면 완전정리
          </h3>
          <p className="mt-1 line-clamp-2 text-[16px] leading-snug text-muted">
            인구·지구·학교·개발 현황
          </p>
        </Link>
      </div>
    </section>
  );
}

const TOWN_CARD = "min-w-0 bg-rose-soft p-4";
const TOWN_TITLE = "mb-2 font-display text-[19px] font-black text-rose-deep";

// 우리 동네 — 글이 없는 칸은 만들지 않는다.
export function TownBand({
  survey,
  posts,
  businesses,
}: {
  survey: SurveySummary | null;
  posts: BoardPost[];
  businesses: Business[];
}) {
  if (!survey && posts.length === 0 && businesses.length === 0) return null;
  return (
    <section className={BAND}>
      <h2 className={BAND_TITLE}>우리 동네</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {survey && (
          <Link href={`/surveys/${survey.slug}`} className={`block ${TOWN_CARD}`}>
            <h3 className={TOWN_TITLE}>주민 의견 조사</h3>
            <p className="text-[18px] font-bold leading-snug">{survey.title}</p>
            <p className="mt-1 text-[16px] text-muted">
              참여 {survey.totalVotes.toLocaleString()}명
              {remainingLabel(survey.endsAt) &&
                ` · ${remainingLabel(survey.endsAt)}`}
            </p>
          </Link>
        )}
        {posts.length > 0 && (
          <div className={TOWN_CARD}>
            <h3 className={TOWN_TITLE}>게시판 새 글</h3>
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/board/${p.id}`}
                className="flex min-h-[44px] items-center text-[17px] leading-snug"
              >
                <span className="line-clamp-2">{p.title}</span>
              </Link>
            ))}
          </div>
        )}
        {businesses.length > 0 && (
          <div className={TOWN_CARD}>
            <h3 className={TOWN_TITLE}>해룡상권</h3>
            {businesses.map((b) => (
              <Link
                key={b.id}
                href={`/district/${b.id}`}
                className="flex min-h-[44px] items-center text-[17px] leading-snug"
              >
                <span className="line-clamp-1">{b.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
