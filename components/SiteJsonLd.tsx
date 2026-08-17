import { MEDIA } from "@/lib/media";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 홈 구조화 데이터 — 검색 결과에 뜨는 '사이트 이름'과 발행사 정보.
//
// 구글은 검색 결과 제목 위에 표시할 사이트 이름을 홈페이지의 WebSite
// 구조화 데이터에서 가져온다. 이게 없으면 도메인(sdtime.net)을 그대로 쓴다.
// og:site_name만으로는 채택되지 않는다.
//
// 채택 조건은 아래 셋이 서로 어긋나지 않는 것이다.
//   · WebSite 의 name
//   · og:site_name        (app/layout.tsx)
//   · 홈 <title> 의 앞부분 (app/layout.tsx)
// 셋 중 하나라도 다르면 구글이 통째로 무시하고 도메인을 쓴다.
//
// 홈에서만 쓴다. 구글은 사이트 이름을 홈페이지에서만 읽는다.
export default function SiteJsonLd() {
  // 등록일(2026.07.27) → 구조화 데이터가 요구하는 ISO 형식.
  // lib/media.ts 를 단일 출처로 두고 여기서 형식만 바꾼다.
  const foundingDate = MEDIA.regDateShort.replace(/\./g, "-");

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: MEDIA.name,
    // 사람들이 실제로 검색창에 치는 표현들. 이름 후보를 넓혀준다.
    alternateName: [`${MEDIA.name} ${MEDIA.homepage}`, `순천 ${MEDIA.name}`],
    url: `${SITE_URL}/`,
    inLanguage: "ko-KR",
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: MEDIA.name,
    url: `${SITE_URL}/`,
    // 로고는 크기를 읽을 수 있는 래스터 이미지를 쓴다. 구글 가이드가
    // 폭·높이를 명시하라고 요구하는데 SVG로는 그 값을 줄 수 없다.
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    foundingDate,
    email: MEDIA.email,
    // 화면(푸터·발행인 페이지)에 실은 것과 같은 값만 넣는다. 구조화 데이터에만
    // 더 자세한 주소를 적으면, 화면에서 가린 것이 검색엔진에는 넘어간다.
    telephone: MEDIA.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: MEDIA.addressPublic,
      addressCountry: "KR",
    },
    areaServed: "전라남도 순천시 해룡면",
    // 같은 매체가 운영하는 다른 계정들. 구글이 하나의 발행사로 묶는다.
    sameAs: [MEDIA.kakaoChannel, MEDIA.naverBlog],
    // 등록 매체임을 밝힌다 — 뉴스 매체 판단에 쓰인다.
    publishingPrinciples: `${SITE_URL}/legal/publisher`,
  };

  return (
    <>
      {[website, organization].map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify 결과라 사용자 입력이 그대로 실행될 여지는 없지만,
          // 태그 조기 종료만 막아둔다(기존 구조화 데이터와 같은 방식).
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
