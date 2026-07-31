import { MEDIA } from "@/lib/media";

// 기사 구조화 데이터(schema.org NewsArticle).
// 이게 없으면 구글이 이 페이지를 '뉴스 기사'로 인식하지 못해 뉴스 후보에서 빠진다.
//
// datePublished / dateModified는 반드시 실제 값이어야 한다. 수정하지 않았는데
// 최신 시각을 넣으면 날짜 조작으로 보고 색인에서 불이익을 준다.
// 그래서 updatedAtIso는 '발행 이후 실제로 고친 경우'에만 채워진다.
export default function NewsArticleJsonLd({
  slug,
  headline,
  description,
  imageUrl,
  publishedAtIso,
  updatedAtIso,
  author,
  section,
  siteUrl,
}: {
  slug: string;
  headline: string;
  description?: string | null;
  imageUrl?: string | null;
  publishedAtIso: string | null;
  updatedAtIso: string | null;
  author: string;
  section: string;
  siteUrl: string;
}) {
  const url = `${siteUrl}/article/${slug}`;

  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    ...(description ? { description } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(publishedAtIso ? { datePublished: publishedAtIso } : {}),
    // 수정 이력이 없으면 발행일과 같게 둔다(둘 다 실제 값).
    dateModified: updatedAtIso ?? publishedAtIso ?? undefined,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: MEDIA.name,
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: section,
    inLanguage: "ko-KR",
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify 결과라 사용자 입력이 그대로 실행될 여지는 없지만,
      // 태그 조기 종료만 막아둔다.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
