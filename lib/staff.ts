// 필자 명단. 공개 프로필 /reporters/[handle]의 원본이다.
//
// 왜 필요한가: 구글은 뉴스 매체를 판단할 때 '이 기사를 누가 썼고 그 사람을
// 추적할 수 있는가'를 본다. 바이라인만 있고 필자 정보가 없으면 신호가 약하다.
//
// 2026-08-12 발행인 요청으로 개인 성명 대신 매체명으로 바이라인을 낸다.
// 그래서 지금 명단에는 사람이 아니라 편집부가 들어 있다 — 구조화 데이터도
// Person이 아니라 Organization으로 나간다(NewsArticleJsonLd).
// 시민기자가 늘면 profiles 테이블에 handle·bio 컬럼을 붙여 DB로 옮기는 편이 낫다.

import { MEDIA } from "@/lib/media";

export interface Staff {
  handle: string; // URL — /reporters/{handle}
  name: string; // 바이라인에 찍히는 이름. profiles.nickname과 일치시켜야 연결된다
  title: string; // 직함
  areas: string[]; // 담당 분야
  email: string;
  bio: string;
}

export const STAFF: Staff[] = [
  {
    handle: "haeryong",
    name: MEDIA.name,
    title: "편집부",
    areas: ["지역소식", "행정", "생활"],
    email: MEDIA.email,
    bio: "순천시 해룡면에서 신대·선월·복성지구 소식을 취재합니다. 어린이집 대기, 버스 배차, 상가 공실처럼 큰 신문이 다루지 않는 생활 현안을 가까이에서 확인해 전합니다.",
  },
];

// 이 이름이 사람이 아니라 매체 자신인가. 구조화 데이터에서 Person과
// Organization을 가르는 기준이다.
export function isDesk(name: string | null | undefined): boolean {
  return name === MEDIA.name;
}

export function findStaffByName(name: string | null | undefined): Staff | null {
  if (!name) return null;
  return STAFF.find((s) => s.name === name) ?? null;
}

export function findStaffByHandle(handle: string): Staff | null {
  return STAFF.find((s) => s.handle === handle) ?? null;
}
