// 기사 슬러그(URL) 정규화. 관리자 에디터와 초안 발행이 같은 규칙을 쓴다.
//
// 한글은 URL에 그대로 쓸 수 없어 걸러진다. 걸러낸 결과가 비면 막지 말고
// 날짜 기반으로 자동 생성한다(입력 실수로 저장이 실패하지 않게).
export function normalizeSlug(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length >= 2) return s;

  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `article-${ymd}-${Math.random().toString(36).slice(2, 6)}`;
}
