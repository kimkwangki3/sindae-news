// 법적 페이지 5종 콘텐츠. 사실 항목은 인터넷신문사업 등록증(전남광주,아00766)을 근거로 기재.
// ⚠️ 발행인·편집인·발행소·명칭·홈페이지 주소가 바뀌면 변경등록 신고가 먼저다(미신고 발행 과태료).
// 후속: 관리자 '법적 페이지' 관리에서 DB로 편집 가능하게 전환(db/legal-migration.sql 실행 필요).

import { MEDIA } from "./media";

export interface LegalSection {
  heading?: string;
  body: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}

const DOCS: LegalDoc[] = [
  {
    slug: "publisher",
    title: "발행인·편집인",
    updated: "2026.07.31",
    sections: [
      {
        body: [
          "본 매체는 「신문 등의 진흥에 관한 법률」 제21조에 따라 아래 사항을 게재합니다.",
        ],
      },
      {
        // 법 제21조 나열 순서 그대로 — 점검 시 대조가 쉽도록 순서를 지킨다.
        heading: "필요적 게재사항",
        body: [
          `명칭: ${MEDIA.name}`,
          `등록번호: ${MEDIA.regNo}`,
          // 등록증상 전화번호(010-3535-1221)는 유지되며, 대외 연락은 이메일로 받는다.
          `발행소 연락처: ${MEDIA.email}`,
          `등록연월일: ${MEDIA.regDate}`,
          `제호: ${MEDIA.name}`,
          `간별: ${MEDIA.kind}`,
          `발행인: ${MEDIA.publisher}`,
          `편집인: ${MEDIA.editor}`,
          // 발행소 주소는 발행인 판단으로 미노출(자택). 등록증 원본은 변동 없다.
          "발행연월일: 기사별 게재일자로 갈음 (각 기사 상단 표시)",
        ],
      },
      {
        heading: "매체 정보",
        body: [
          `청소년보호책임자: ${MEDIA.youthOfficer}`,
          `이메일: ${MEDIA.email}`,
          `홈페이지: ${MEDIA.homepage}`,
          `보급지역: ${MEDIA.circulation} · 보급대상: ${MEDIA.audience} · ${MEDIA.price}`,
          `운영사: ${MEDIA.operator}`,
        ],
      },
      {
        heading: "발행목적",
        body: [
          "순천 동부권의 지역 소식과 현안을 신속, 정확히 보도하여 주민의 알권리 보장에 기여합니다.",
          "보도 대상 지역: 순천시 해룡면(신대·선월·복성지구) 중심, 순천 동부권 전반",
        ],
      },
    ],
  },
  {
    slug: "youth",
    title: "청소년보호정책",
    updated: "2026.07.31",
    sections: [
      {
        body: [
          `${MEDIA.name}은 청소년이 유해 정보에 노출되지 않도록 「청소년 보호법」에 따라 청소년보호정책을 수립·시행합니다.`,
        ],
      },
      {
        heading: "1. 유해정보로부터의 청소년 보호계획",
        body: [
          "청소년 유해정보의 게시·유통을 차단하기 위해 모니터링과 신고 처리 절차를 운영합니다.",
        ],
      },
      {
        heading: "2. 유해정보에 대한 청소년 접근제한 및 관리조치",
        body: [
          "유해성이 확인된 게시물은 즉시 숨김·삭제 처리하며, 반복 위반 이용자는 이용을 제한합니다.",
        ],
      },
      {
        heading: "3. 청소년보호책임자",
        body: [
          `청소년보호책임자: ${MEDIA.youthOfficer}`,
          `연락처: ${MEDIA.email}`,
        ],
      },
    ],
  },
  {
    slug: "ethics",
    title: "윤리강령",
    updated: "2026.06.27",
    sections: [
      {
        body: [
          `${MEDIA.name}과 소속·시민기자는 다음의 윤리강령을 준수하여 공정하고 책임 있는 보도를 실천합니다.`,
        ],
      },
      {
        heading: "1. 진실 보도",
        body: ["사실에 근거하여 정확하게 보도하며, 허위·과장 보도를 하지 않습니다."],
      },
      {
        heading: "2. 공정성과 독립성",
        body: [
          "특정 정파·이해관계로부터 독립하여 균형 있게 보도하며, 부당한 청탁을 받지 않습니다.",
        ],
      },
      {
        heading: "3. 인격권 보호",
        body: [
          "취재·보도 과정에서 개인의 명예와 사생활, 초상권을 존중하며 침해하지 않습니다.",
        ],
      },
      {
        heading: "4. 이해충돌 회피",
        body: ["보도와 광고를 명확히 구분하고, 사적 이익을 위해 지위를 이용하지 않습니다."],
      },
    ],
  },
  {
    slug: "correction",
    title: "정정보도 청구 안내",
    updated: "2026.07.31",
    sections: [
      {
        body: [
          "사실과 다른 보도로 피해를 입은 경우 「언론중재 및 피해구제 등에 관한 법률」에 따라 정정·반론 보도를 청구할 수 있습니다.",
        ],
      },
      {
        heading: "청구 방법",
        body: [
          "해당 보도가 있음을 안 날부터 3개월 이내(게재 후 6개월 이내)에 이메일로 청구할 수 있습니다.",
          `청구 접수: ${MEDIA.email}`,
          `담당: ${MEDIA.editor}(편집인)`,
        ],
      },
      {
        heading: "처리 절차",
        body: [
          "접수일로부터 3일 이내에 처리 방향을 회신합니다.",
          "오보가 확인되면 24시간 이내에 정정문을 게재합니다.",
          "협의가 어려운 경우 언론중재위원회에 조정을 신청할 수 있습니다. (www.pac.or.kr · 1544-4111)",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "개인정보처리방침",
    updated: "2026.07.31",
    sections: [
      {
        body: [
          `${MEDIA.name}(운영사 ${MEDIA.operator}, 이하 ‘회사’)은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 권익을 보장합니다.`,
        ],
      },
      {
        heading: "1. 수집하는 개인정보 항목",
        body: [
          "회원가입: 카카오 계정 식별자, 닉네임, (선택)거주 동네·연락처",
          "서비스 이용 과정: 접속 IP, 기기·브라우저 정보, 이용 기록",
          "제보·신고·기자 신청: 제출하신 내용과 연락처, 접수 시점의 접속 IP (책임 서약 및 접수 사실의 증빙 목적)",
        ],
      },
      {
        heading: "2. 이용 목적",
        body: [
          "회원 식별·관리, 댓글·게시·신고 등 서비스 제공, 부정 이용 방지 및 통계 분석.",
        ],
      },
      {
        heading: "3. 보유 및 이용 기간",
        body: [
          "회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.",
        ],
      },
      {
        heading: "4. 개인정보 보호책임자",
        body: [
          `개인정보 보호책임자: ${MEDIA.privacyOfficer}`,
          `연락처: ${MEDIA.email}`,
        ],
      },
    ],
  },
];

export function getLegalDoc(slug: string): LegalDoc | null {
  return DOCS.find((d) => d.slug === slug) ?? null;
}

export const LEGAL_LINKS = DOCS.map((d) => ({ slug: d.slug, title: d.title }));
