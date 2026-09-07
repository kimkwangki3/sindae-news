import Link from "next/link";
import ArticleListItem from "@/components/ArticleListItem";
import ShareButton from "@/components/ShareButton";
import { getArticlesByTag } from "@/lib/mock/articles";
import { MEDIA } from "@/lib/media";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 해룡면 안내 — 뉴스가 아니라 상설(에버그린) 페이지다.
//
// 왜 있나: 서치콘솔에서 '해룡면' '순천 해룡면' '순천시 해룡면' 이 이미 평균
// 6위로 노출되는데 클릭이 0이었다. 검색한 사람은 "이 동네가 어떤 곳인가"를
// 알고 싶은데 뜨는 것이 그날치 기사라서 나무위키·위키백과로 갔다. 그 수요를
// 받는 자리가 없어서 생긴 손실이고, 이 페이지가 그 자리다.
//
// 그래서 문체가 기사와 다르다. "~했다"가 아니라 "~입니다"로 쓴다.
//
// ⚠️ 갱신 책임 — 상설 페이지는 최신성이 생명이다. 아래 셋은 시간이 지나면
//    반드시 틀린 값이 된다. 바뀐 것을 보면 그때 고친다.
//      · POPULATION — 순천시 주민등록 인구통계
//      · 선월지구 고교 설립 — 추진 단계인지 확정인지 (전남도교육청)
//      · 코스트코 개점 시점 — 2028년 하반기 '목표'라 밀릴 수 있다

// 공유 카드용 — 제목·설명을 og와 트위터가 같이 쓴다. 따로 적으면 한쪽만
// 고쳤을 때 페이스북과 카카오톡에 서로 다른 문구가 나간다.
const OG_TITLE = "해룡면 완전정리 — 인구·지구·학교·교통 한눈에";
const OG_DESCRIPTION =
  "순천시 해룡면 안내. 인구, 신대·선월·상삼 지구별 구성, 학교, 개발 현황을 한 페이지에.";
// 이 페이지 전용 그림이 없으므로 신문 기본 이미지를 쓴다.
const OG_IMAGE = "/og-image.png";

export const metadata = {
  title: "해룡면 완전정리 — 인구·지구·학교·교통 한눈에 · 해룡신문",
  description:
    "순천시 해룡면 안내. 전국에서 인구가 가장 많은 면으로 신대지구·선월지구·상삼권을 아우릅니다. 인구, 지구별 구성, 학교, 개발 현황을 한 페이지에 정리했습니다.",
  alternates: { canonical: "/haeryong" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    // openGraph를 선언하면 상위(layout)의 것을 통째로 대체한다. siteName·
    // locale·이미지를 여기 다시 적지 않으면 공유 카드에 매체명과 그림이
    // 빠져 어디 페이지인지 알 수 없다.
    siteName: MEDIA.name,
    locale: "ko_KR",
    type: "website",
    url: "/haeryong",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// 관련 기사를 붙이느라 DB를 읽는다. 갱신이 바로 반영되어야 하므로
// /info 와 같이 요청 시점 생성으로 둔다.
export const dynamic = "force-dynamic";

// 이 페이지에 나오는 수치는 전부 여기서만 고친다. 본문 곳곳에 숫자를 흩어
// 놓으면 갱신할 때 하나만 고치고 나머지를 빠뜨리게 된다.
const POPULATION = {
  asOf: "2025년 10월",
  now: "5만 4,445명",
  base: "5만 5,514명",
  baseYear: "2020년",
};

// 페이지를 마지막으로 손본 시점. 수치를 갱신하면 이것도 같이 올린다.
const PAGE_UPDATED = "2026년 9월";

// 질문은 사람들이 실제로 검색창에 치는 문장 그대로 적는다.
// 화면과 구조화 데이터가 이 배열 하나를 같이 쓴다 — 둘을 따로 적으면
// 한쪽만 고쳤을 때 구글에는 옛날 답이 남는다.
//
// 아직 답할 자료가 없어 비워 둔 질문들(검색 수요는 있다):
//   해룡면 버스 노선 / 신대지구 아파트 단지 / 행정복지센터 위치·전화
// 자료가 모이면 여기에 항목을 더한다.
const FAQ: { q: string; a: string }[] = [
  {
    q: "해룡면 인구는 얼마나 되나요?",
    a: `${POPULATION.asOf} 기준 ${POPULATION.now}입니다. 전국에서 인구가 가장 많은 면입니다.`,
  },
  {
    q: "신대지구와 선월지구는 어떻게 다른가요?",
    a: "신대지구는 2012년부터 2020년 사이에 조성이 끝난 기존 신도시이고, 선월지구는 약 6,000가구 규모로 지금 조성 중인 신규 지구입니다. 두 지구는 생활권을 함께 씁니다.",
  },
  {
    q: "해룡면에 고등학교가 있나요?",
    a: "인문계 고교는 상삼권의 순천복성고 한 곳뿐입니다. 신대지구 학생들은 가산터널을 넘어 시내권으로 원거리 통학합니다.",
  },
  {
    q: "코스트코 순천점은 언제 여나요?",
    a: "2028년 하반기 개점을 목표로 하고 있습니다. 광주·전남 지역의 첫 입점입니다.",
  },
];

// 목차. 검색에서 들어온 사람이 자기가 궁금한 항목으로 바로 뛸 수 있게 한다.
const TOC = [
  { id: "overview", label: "어떤 곳인가" },
  { id: "population", label: "인구" },
  { id: "districts", label: "지구별 구성" },
  { id: "schools", label: "학교" },
  { id: "development", label: "생활·개발" },
  { id: "origin", label: "지명 유래" },
  { id: "places", label: "가볼 만한 곳" },
  { id: "faq", label: "자주 묻는 것" },
];

// 관련 기사를 끌어올 태그. 앞에 적은 태그의 기사가 먼저 붙는다.
const RELATED_TAGS = ["해룡면", "선월지구", "신대지구"];

const CARD = "rounded-card border border-line bg-white p-4";
const BODY = "text-[19px] leading-[1.85] text-ink";
const LIST =
  "mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[18px] leading-relaxed text-ink";
const CARD_P = "mt-2 text-[18px] leading-relaxed text-ink";
const H2 = "text-xl text-rose-deep";
const H3 = "text-lg text-ink";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt — 목차에서 뛰어왔을 때 제목이 화면 맨 위에 딱 붙지 않게 띄운다.
    <section id={id} className="mt-9 scroll-mt-4">
      <h2 className={H2}>{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default async function HaeryongPage() {
  const lists = await Promise.all(
    RELATED_TAGS.map((tag) => getArticlesByTag(tag, 6)),
  );
  // 같은 기사가 태그를 여러 개 달고 있으면 두 번 나온다. 슬러그로 거른다.
  const seen = new Set<string>();
  const related = lists
    .flat()
    .filter((a) => {
      if (seen.has(a.slug)) return false;
      seen.add(a.slug);
      return true;
    })
    .slice(0, 6);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // 이 주소가 '해룡면이라는 장소'를 설명하는 안내문임을 밝힌다.
  // 검색 결과에 별도 카드로 뜨는 종류는 아니지만, 구글이 이 페이지를
  // 그날치 기사가 아니라 지역 안내로 묶는 데 쓰인다.
  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "해룡면 완전정리",
    url: `${SITE_URL}/haeryong`,
    inLanguage: "ko-KR",
    description: metadata.description,
    about: {
      "@type": "Place",
      name: "해룡면",
      alternateName: ["순천 해룡면", "순천시 해룡면"],
      address: {
        "@type": "PostalAddress",
        addressRegion: "전라남도",
        addressLocality: "순천시 해룡면",
        addressCountry: "KR",
      },
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: MEDIA.name,
      url: `${SITE_URL}/`,
    },
  };

  return (
    <div className="px-[18px] py-6">
      {[faqJsonLd, placeJsonLd].map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify 결과라 사용자 입력이 실행될 여지는 없지만,
          // 태그 조기 종료만 막아둔다(기존 구조화 데이터와 같은 방식).
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <p className="text-[16px] font-bold text-rose">지역 안내</p>
      <h1 className="mt-1 text-2xl leading-snug text-rose-deep">
        해룡면 완전정리
      </h1>
      <p className={`mt-2 ${BODY}`}>
        순천시 해룡면이 어떤 동네인지 한 페이지에 모았습니다. 인구, 신대·선월·
        상삼 지구별 구성, 학교, 개발 현황 순입니다.
      </p>

      {/* 한눈에 보기 — 검색으로 들어온 사람이 가장 먼저 확인하는 네 가지 */}
      <dl className={`mt-5 grid grid-cols-2 gap-3 ${CARD}`}>
        <div>
          <dt className="text-[16px] text-muted">인구 ({POPULATION.asOf})</dt>
          <dd className="mt-0.5 text-[19px] font-bold text-ink">
            {POPULATION.now}
          </dd>
        </div>
        <div>
          <dt className="text-[16px] text-muted">위치</dt>
          <dd className="mt-0.5 text-[19px] font-bold text-ink">
            순천시 남동부
          </dd>
        </div>
        <div>
          <dt className="text-[16px] text-muted">주요 지구</dt>
          <dd className="mt-0.5 text-[19px] font-bold text-ink">
            신대 · 선월 · 상삼
          </dd>
        </div>
        <div>
          <dt className="text-[16px] text-muted">인문계 고교</dt>
          <dd className="mt-0.5 text-[19px] font-bold text-ink">
            순천복성고 1곳
          </dd>
        </div>
      </dl>

      {/* 목차 — 터치 타깃 44px 이상 */}
      <nav aria-label="목차" className="mt-5">
        <ul className="flex flex-wrap gap-2">
          {TOC.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="flex min-h-[44px] items-center rounded-element border border-line bg-ivory-2 px-3.5 text-[17px] text-ink"
              >
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="overview" title="해룡면은 어떤 곳인가">
        <p className={BODY}>
          해룡면은 순천시 남동부에 있는 면입니다.{" "}
          <b className="text-body-navy">전국에서 인구가 가장 많은 면</b>으로,
          아파트가 밀집한 신대지구와 지금 조성 중인 선월지구, 기존 생활권인
          상삼권을 아우릅니다.
        </p>
        <p className={BODY}>
          해룡산업단지(해룡산단)를 안고 있어 주거지와 산업단지가 한 면에 함께
          있는 구조입니다.
        </p>
      </Section>

      <Section id="population" title="해룡면 인구">
        <div className={CARD}>
          <div className="flex items-baseline justify-between border-b border-line pb-2.5">
            <span className="text-[18px] text-muted">{POPULATION.baseYear}</span>
            <span className="text-[20px] font-bold text-ink">
              {POPULATION.base}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-2.5">
            <span className="text-[18px] text-muted">{POPULATION.asOf}</span>
            <span className="text-[20px] font-bold text-ink">
              {POPULATION.now}
            </span>
          </div>
        </div>
        <p className={BODY}>
          5년 사이 인구가 늘지 않고{" "}
          <b className="text-body-red">오히려 줄었습니다.</b> 신대출장소 관할
          인구도 3만 명 초반에서 멈춰 있습니다.
        </p>
        <p className="text-[17px] leading-relaxed text-muted">
          인구는 순천시 주민등록 인구통계를 따르며, 위 숫자는 {POPULATION.asOf}{" "}
          기준입니다.
        </p>
      </Section>

      <Section id="districts" title="지구별 구성">
        <div className={CARD}>
          <h3 className={H3}>신대지구</h3>
          <ul className={LIST}>
            <li>
              2012년 중흥S-클래스 1단지를 시작으로 8년간 1만 세대 가까이 공급
            </li>
            <li>
              2020년 이후 대규모 신규 입주가 끊겼습니다 — 인구 정체의 직접 원인
            </li>
            <li>2016년 신대출장소 설치</li>
          </ul>
        </div>

        <div className={CARD}>
          <h3 className={H3}>선월지구</h3>
          <ul className={LIST}>
            <li>공동주택 약 6,000가구 규모</li>
            <li>택지 조성 공정률 60% 이상</li>
            <li>신대지구와 생활권을 함께 씁니다</li>
          </ul>
        </div>

        {/* 이 권역을 기사에서는 '상삼권'으로, 회원가입·통계에서는 '복성지구'로
            부르고 있다(lib/region.ts). 같은 곳을 가리키는지 편집인 확인이
            필요해, 여기서는 기사에 쓴 '상삼권'만 적어 둔다. */}
        <div className={CARD}>
          <h3 className={H3}>상삼권</h3>
          <ul className={LIST}>
            <li>1995년 금당지구 개발로 상삼출장소 설치</li>
            <li>해룡면 유일의 인문계 고교인 순천복성고가 있는 곳</li>
          </ul>
        </div>
      </Section>

      <Section id="schools" title="해룡면 학교">
        <p className={BODY}>
          해룡면 관내 인문계 고교는{" "}
          <b className="text-body-navy">순천복성고 한 곳뿐</b>입니다. 초등학교와
          중학교는 갖춰져 있지만, 신대지구 학생들은 가산터널을 넘어 시내권으로
          원거리 통학을 합니다. 고교가 없다는 점이 이 동네에서 가장 오래된
          현안입니다.
        </p>
        <div className={CARD}>
          <h3 className={H3}>선월지구 학교 계획</h3>
          <p className={CARD_P}>
            전남도교육청 계획으로 유치원 1곳, 초등학교 2개교, 중학교 1개교가
            착공 예정입니다. 고등학교 설립도 추진 대상에 올라 있으나 아직
            확정된 단계는 아닙니다.
          </p>
        </div>
        <div className={CARD}>
          <h3 className={H3}>고교 신설과 이설의 차이</h3>
          <p className={CARD_P}>
            신설은 교육부 중앙투자심사에서 앞으로 학생 수가 늘어난다는 것을
            입증해야 합니다. 학령인구가 줄어드는 추세라 이 관문이 갈수록
            좁아집니다. 이설은 학생 수가 줄어 여유가 생긴 학교를 수요가 있는
            곳으로 옮기는 방식이라 심사 부담이 상대적으로 작습니다.
          </p>
        </div>
      </Section>

      <Section id="development" title="생활 인프라와 개발 현황">
        <div className={CARD}>
          <h3 className={H3}>코스트코 순천점</h3>
          <ul className={LIST}>
            <li>부지 4만 6,000㎡, 총사업비 1,020억 원</li>
            <li>2028년 하반기 개점 목표</li>
            <li>광주·전남 첫 입점, 약 250명 고용 예상</li>
          </ul>
          <p className="mt-2 text-[17px] leading-relaxed text-muted">
            개점 시점은 목표이며 사정에 따라 달라질 수 있습니다.
          </p>
        </div>
        <div className={CARD}>
          <h3 className={H3}>해룡산업단지와 방위산업</h3>
          <p className={CARD_P}>
            순천시가 방위산업 생태계 조성을 추진하고 있고, 해룡산단이 공급망
            기반 후보지로 거론되고 있습니다.
          </p>
        </div>
      </Section>

      <Section id="origin" title="해룡면 지명의 유래">
        <p className={BODY}>
          1896년(고종 33년) 이 일대는 북쪽의 해촌면(海村面)과 남쪽의
          용두면(龍頭面) 두 면이었습니다. 1914년 행정구역 개편 때 두 면이
          합쳐지면서 해촌의 &lsquo;해&rsquo;와 용두의 &lsquo;용&rsquo;을 따{" "}
          <b className="text-body-navy">해룡면</b>이 되었습니다.
        </p>
        <p className={BODY}>
          1949년 순천읍이 시로 승격하면서 왕지·조례·연향 3개 리가 순천시로
          갈라져 나갔고, 1995년 시군 통합으로 지금의 순천시 해룡면이 되었습니다.
        </p>
        <div className={CARD}>
          <h3 className={H3}>원조 &lsquo;해룡&rsquo;은 따로 있습니다</h3>
          <p className={CARD_P}>
            고려시대 13조창 가운데 하나인 해룡창(海龍倉)은 지금의 홍내동·오천동
            해룡산 일대에 있었습니다. 이름은 남쪽으로 건너왔고 뿌리는 북쪽에
            남은 셈입니다.
          </p>
        </div>
      </Section>

      <Section id="places" title="가볼 만한 곳과 이야기">
        <div className={CARD}>
          <h3 className={H3}>앵무산 (하사리)</h3>
          <p className={CARD_P}>
            양미산(糧米山)이라는 다른 이름이 있습니다. 임진왜란 때 산을 마름으로
            덮어 군량미 노적가리처럼 보이게 했다는 이야기가 전해집니다.
          </p>
        </div>
        <div className={CARD}>
          <h3 className={H3}>충무사 (신성리)</h3>
          <p className={CARD_P}>1690년(숙종 16년) 주민들이 세운 사당입니다.</p>
        </div>
        <div className={CARD}>
          <h3 className={H3}>용전리 · 농주리</h3>
          <p className={CARD_P}>용 전설이 깃든 마을 이름입니다.</p>
        </div>
      </Section>

      <Section id="faq" title="자주 묻는 것">
        {FAQ.map((f) => (
          <div key={f.q} className={CARD}>
            <h3 className={H3}>{f.q}</h3>
            <p className={CARD_P}>{f.a}</p>
          </div>
        ))}
      </Section>

      {related.length > 0 && (
        <section className="mt-9">
          <h2 className={H2}>해룡면 관련 기사</h2>
          <div className="mt-2">
            {related.map((a) => (
              <ArticleListItem key={a.slug} article={a} />
            ))}
          </div>
          <Link
            href="/articles"
            className="mt-3 flex min-h-[48px] items-center justify-center rounded-element border border-line bg-ivory-2 text-[18px] text-ink"
          >
            기사 더 보기 ›
          </Link>
        </section>
      )}

      <section className="mt-9">
        <h2 className={H2}>생활정보도 있습니다</h2>
        <p className={`mt-2 ${BODY}`}>
          버스 시간표, 야간·휴일 병원과 약국, 재활용 배출 요일처럼 사는 데
          필요한 것들은 따로 모아 두고 갱신합니다.
        </p>
        <Link
          href="/info"
          className="mt-3 flex min-h-[48px] items-center justify-center rounded-element border border-line bg-ivory-2 text-[18px] text-ink"
        >
          해룡면 생활정보 보기 ›
        </Link>
      </section>

      {/* 언제 기준인지, 어디서 온 자료인지, 틀렸을 때 어디로 알리는지.
          신문사가 낸 안내라 셋을 늘 함께 둔다(/info 상세와 같은 형식). */}
      <div className="mt-8 rounded-card border border-line bg-ivory-2 p-4 text-[17px] leading-relaxed text-muted">
        <p>
          <b className="text-ink">{PAGE_UPDATED}</b> 기준으로 정리한 안내입니다.
          인구와 개발 현황이 바뀌면 갱신합니다.
        </p>
        <p className="mt-1.5">
          출처: {MEDIA.name} 「해룡면 &lsquo;해룡&rsquo;은 어디서 왔을까」,
          「신대지구 인구 3만에서 멈췄다… 반전 카드는 &lsquo;선월지구&rsquo;」 ·
          원자료는 순천시 읍면동 소개, 한국민족문화대백과사전,
          디지털순천문화대전입니다.
        </p>
        <p className="mt-1.5">
          이 안내는 생성형 AI의 도움을 받아 정리했으며, 게재 전 편집인이
          사실관계를 확인했습니다. 책임은 {MEDIA.name}에 있습니다.
        </p>
        <p className="mt-1.5">
          내용이 사실과 다르거나 바뀐 것을 알고 계시면{" "}
          <Link href="/tips" className="underline">
            제보
          </Link>
          로 알려주시면 바로잡겠습니다.
        </p>
        <p className="mt-1.5">
          ⓒ {MEDIA.name}({MEDIA.regNo}) · 무단전재 및 재배포 금지
        </p>
      </div>

      <div className="mt-4">
        <ShareButton
          title="해룡면 완전정리"
          text="순천시 해룡면 인구·지구·학교·개발 현황 한눈에"
          label="공유하기"
        />
      </div>
    </div>
  );
}
