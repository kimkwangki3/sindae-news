import Link from "next/link";
import CategoryNav from "@/components/CategoryNav";
import AdSlot from "@/components/AdSlot";
import Thumb from "@/components/Thumb";
import ArticleListItem from "@/components/ArticleListItem";
import {
  CATEGORY_NAME,
  getArticlesPage,
  getLead,
} from "@/lib/mock/articles";

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h3 className="text-[17px] text-rose-deep">{title}</h3>
      <Link href={href} className="text-xs text-rose">
        더보기 ›
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [lead, localPage, peoplePage] = await Promise.all([
    getLead(),
    getArticlesPage("local", 0, 3),
    getArticlesPage("people", 0, 2),
  ]);
  const localNews = localPage.items;
  const people = peoplePage.items;

  return (
    <>
      <CategoryNav />

      <div className="px-[18px] pb-6">
        {/* 오늘의 헤드라인 */}
        {lead && (
          <section className="pt-[18px]">
            <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-rose">
              오늘의 헤드라인
            </span>
            <Link href={`/article/${lead.slug}`} className="mt-3.5 block">
              <Thumb
                className="h-[200px] w-full"
                rounded="rounded-card"
                alt={lead.title}
              />
              <h2 className="mt-3.5 text-[23px] font-extrabold leading-snug">
                {lead.title}
              </h2>
              <p className="mt-2 text-xs text-muted">
                {CATEGORY_NAME[lead.category]} · {lead.publishedAt} ·{" "}
                {lead.author}
              </p>
            </Link>
          </section>
        )}

        <AdSlot slot="home-top" />

        {/* 지역소식 */}
        <section>
          <SectionTitle title="지역소식" href="/articles/local" />
          {localNews.map((a) => (
            <ArticleListItem key={a.slug} article={a} />
          ))}
        </section>

        {/* 인물 */}
        <section>
          <SectionTitle title="인물" href="/articles/people" />
          {people.map((a) => (
            <ArticleListItem key={a.slug} article={a} />
          ))}
        </section>
      </div>
    </>
  );
}
