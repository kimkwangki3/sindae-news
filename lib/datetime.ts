// 날짜·시각 표기 — 전부 한국시각으로.
//
// 왜 이 파일이 있는가.
//
// 서버(Vercel)도 DB(Supabase)도 UTC로 돈다. timestamptz 를 문자열로 받으면
// "2026-08-16T01:49:12+00:00" 처럼 UTC로 온다. 여기서 앞 10자나 11~16자를
// 그대로 잘라 쓰면 화면에 UTC가 찍힌다 — 한국보다 아홉 시간 이르다.
//
// 실제로 그렇게 새벽 10시 49분에 등록된 단체가 관리자 목록에 "01:49"로 떠
// 있었다. 자정부터 오전 9시 사이에 벌어진 일은 날짜까지 하루 전으로 밀린다.
//
// 기사 목록(lib/mock/articles.ts)만 이 계산을 제대로 하고 있었고 나머지가
// 전부 문자열을 잘라 쓰고 있었다. 규칙이 파일마다 흩어져 있으면 한쪽만
// 고쳐지므로 여기 하나로 모은다. 새로 날짜를 찍을 일이 생기면 반드시
// 이 파일의 함수를 쓸 것.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// UTC 시각을 한국시각으로 옮긴 Date. 옮긴 뒤에는 getUTC*() 로 읽어야 한다
// (서버의 지역 시간대가 무엇이든 결과가 같아야 하므로 getHours() 는 못 쓴다).
function toKst(ts: string | number | Date): Date | null {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + KST_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026.08.16" — 연도까지. 기사 게재일처럼 시간이 지나도 남는 것에 쓴다. */
export function kstDate(ts: string | null | undefined): string {
  const k = ts ? toKst(ts) : null;
  if (!k) return "";
  return `${k.getUTCFullYear()}.${pad(k.getUTCMonth() + 1)}.${pad(k.getUTCDate())}`;
}

/** "08.16" — 연도 없이. 최근 목록에서 자리를 아낄 때. */
export function kstShortDate(ts: string | null | undefined): string {
  const k = ts ? toKst(ts) : null;
  if (!k) return "";
  return `${pad(k.getUTCMonth() + 1)}.${pad(k.getUTCDate())}`;
}

/** "08.16 10:49" — 목록에서 방금 들어온 것을 가릴 때. */
export function kstDateTime(ts: string | null | undefined): string {
  const k = ts ? toKst(ts) : null;
  if (!k) return "";
  return `${kstShortDate(ts)} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}

/** "2026.08.16 10:49" — 감사 로그처럼 언제인지 정확히 남겨야 하는 곳. */
export function kstFullDateTime(ts: string | null | undefined): string {
  const k = ts ? toKst(ts) : null;
  if (!k) return "";
  return `${kstDate(ts)} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}

/** "10:49" — 시각만. */
export function kstTime(ts: string | number | Date): string {
  const k = toKst(ts);
  if (!k) return "";
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}
