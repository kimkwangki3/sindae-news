// 목록의 쪽 번호는 주소에 ?p=2 로 싣는다.
// 사람이 주소를 손으로 고치거나 봇이 이상한 값을 넣어도 1쪽으로 떨어뜨린다.
export function readPageParam(searchParams?: {
  [key: string]: string | string[] | undefined;
}): number {
  const raw = searchParams?.p;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
