import { MEDIA } from "@/lib/media";
import { findStaffByName, isDesk } from "@/lib/staff";

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
  tags = [],
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
  tags?: string[];
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
    // 필자 프로필이 있으면 url까지 넣는다. 구글은 '필자를 추적할 수 있는가'를 본다.
    // 바이라인이 매체 자신이면 Person이 아니라 Organization이다 — 사람이 아닌
    // 것을 Person으로 내보내면 구조화 데이터가 사실과 어긋난다.
    author: (() => {
      const staff = findStaffByName(author);
      if (!staff) return { "@type": "Person", name: author };
      return {
        "@type": isDesk(staff.name) ? "Organization" : "Person",
        name: staff.name,
        ...(isDesk(staff.name) ? {} : { jobTitle: staff.title }),
        url: `${siteUrl}/reporters/${staff.handle}`,
      };
    })(),
    publisher: {
      "@type": "NewsMediaOrganization",
      name: MEDIA.name,
      url: siteUrl,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: section,
    // 태그 = schema.org keywords. 쉼표로 잇는 게 표준 표기다.
    ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
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
