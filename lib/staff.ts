// 필자(기자) 명단. 공개 프로필 /reporters/[handle]의 원본이다.
//
// 왜 필요한가: 구글은 뉴스 매체를 판단할 때 '이 기사를 누가 썼고 그 사람을
// 추적할 수 있는가'를 본다. 바이라인만 있고 필자 정보가 없으면 신호가 약하다.
//
// 지금은 1인 매체라 배열로 관리한다. 시민기자가 늘면 profiles 테이블에
// handle·bio 컬럼을 붙여 DB로 옮기는 편이 낫다.

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
    handle: "kimkwangki",
    name: "김광기",
    title: "발행인 겸 편집인",
    areas: ["지역소식", "행정", "생활"],
    email: "ghkdtk85@gmail.com",
    bio: "순천시 해룡면에서 신대·선월·복성지구 소식을 취재합니다. 어린이집 대기, 버스 배차, 상가 공실처럼 큰 신문이 다루지 않는 생활 현안을 가까이에서 확인해 전합니다.",
  },
];

export function findStaffByName(name: string | null | undefined): Staff | null {
  if (!name) return null;
  return STAFF.find((s) => s.name === name) ?? null;
}

export function findStaffByHandle(handle: string): Staff | null {
  return STAFF.find((s) => s.handle === handle) ?? null;
}
