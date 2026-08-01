// 매체 기본 정보 단일 출처. 푸터·법적페이지·기사 하단 고지가 모두 여기를 참조한다.
// 값이 흩어져 있으면 하나만 고치고 나머지를 빠뜨리게 되므로 반드시 여기서만 바꾼다.
//
// ⚠️ 발행인·편집인·발행소·명칭·홈페이지 주소는 등록증 기재사항이다.
//    바꾸려면 등록관청 변경등록 신고가 먼저다(미신고 발행 과태료).

export const MEDIA = {
  name: "해룡신문",
  regNo: "전남광주,아00766",
  regDate: "2026년 7월 27일",
  regDateShort: "2026.07.27",
  kind: "인터넷신문",
  // 신문법 제21조는 발행인·편집인의 '성명' 게재를 요구한다. 구글도 뉴스 매체
  // 판단 시 필자를 추적할 수 있는지 보므로 실명으로 표기한다(/reporters).
  publisher: "김광기", // 발행인
  editor: "김광기", // 편집인
  youthOfficer: "김광기", // 청소년보호책임자
  privacyOfficer: "김광기", // 개인정보 보호책임자
  email: "ghkdtk85@gmail.com",
  // ⚠️ 발행소 주소는 자택이라 화면 어디에도 노출하지 않는다(2026-07-31 발행인 결정).
  // 등록증 원본 값이라 참조용으로만 남겨 둔다. 다시 게재할 일이 생기면 이 값을 쓴다.
  address: "(우)57998 전남광주통합특별시 순천시 오천4길 39",
  addressShort: "순천시 오천4길 39",
  homepage: "sdtime.net",
  // 카카오톡 채널. /friend 는 '채널 추가' 화면으로 바로 간다.
  // 검색용 아이디는 '해룡신문'이며 변경할 수 없다.
  kakaoChannel: "https://pf.kakao.com/_xmxhZBX",
  kakaoChannelAdd: "https://pf.kakao.com/_xmxhZBX/friend",
  operator: "DSBH",
  circulation: "전국",
  audience: "일반",
  price: "무가",
} as const;
