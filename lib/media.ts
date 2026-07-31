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
  publisher: "김광기", // 발행인
  editor: "김광기", // 편집인
  youthOfficer: "김광기", // 청소년보호책임자
  privacyOfficer: "김광기", // 개인정보 보호책임자
  email: "ghkdtk85@gmail.com",
  // 등록증 주소 중 도로명까지만 공개(자택이라 동·호수는 생략). 등록증 원본은 변동 없음.
  address: "(우)57998 전남광주통합특별시 순천시 오천4길 39",
  addressShort: "순천시 오천4길 39",
  homepage: "sdtime.net",
  operator: "DSBH",
  circulation: "전국",
  audience: "일반",
  price: "무가",
} as const;
