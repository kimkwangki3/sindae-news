import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleListItem from "@/components/ArticleListItem";
import TagChips from "@/components/article/TagChips";
import { getArticlesByTag, getTopTags } from "@/lib/mock/articles";
import { MEDIA } from "@/lib/media";

// 태그는 한글·공백이 들어가 주소에 인코딩되어 온다. Next가 대개 풀어주지만
// 중복 인코딩(%2523 등)으로 들어오는 경우가 있어 한 번 더 시도한다.
function decodeTag(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export async function generateMetadata({
  params,
}: {
  params: { tag: string };
}) {
  const tag = decodeTag(params.tag);
  const title = `#${tag} · ${MEDIA.name}`;
  return {
    title,
    description: `‘${tag}’ 태그가 붙은 ${MEDIA.name} 기사 모음.`,
    // 태그 페이지는 기사 목록의 다른 배열일 뿐이다. 색인시켜 두면 같은 기사가
    // 여러 주소로 잡혀 원문 기사의 검색 순위를 갉아먹는다. 링크는 따라가되
    // 이 페이지 자체는 색인하지 않는다.
    robots: { index: false, follow: true },
  };
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeTag(params.tag);
  if (!tag) notFound();

  const [items, topTags] = await Promise.all([
    getArticlesByTag(tag),
    getTopTags(12),
  ]);

  // 다른 태그 둘러보기 — 지금 보고 있는 태그는 뺀다.
  const others = topTags.filter((t) => t.tag !== tag).map((t) => t.tag);

  return (
    <div className="px-[18px] py-4 pb-8">
      <p className="text-xs text-muted">태그</p>
      <h1 className="mt-1 text-[27px] font-extrabold">#{tag}</h1>
      <p className="mt-1 text-xs text-muted">기사 {items.length}건</p>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          ‘{tag}’ 태그가 붙은 기사가 아직 없습니다
        </p>
      ) : (
        <div className="mt-2">
          {items.map((a) => (
            <ArticleListItem key={a.slug} article={a} />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base text-rose-deep">다른 태그</h2>
          <TagChips tags={others} />
        </section>
      )}

      <Link
        href="/articles"
        className="mt-8 flex min-h-[48px] items-center justify-center rounded-element border border-line bg-white text-sm font-bold text-muted"
      >
        전체 기사 보기
      </Link>
    </div>
  );
}
