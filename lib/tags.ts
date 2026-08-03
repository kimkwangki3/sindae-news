// 기사 태그 — 저장 형태를 한 곳에서 정한다.
//
// 규칙: '#' 없이, 앞뒤 공백 없이, 같은 글에 중복 없이 저장한다.
// 화면에서만 # 을 붙이고, 주소에서는 encodeURIComponent 로 감싼다.
// 저장할 때 형태가 흔들리면 "선암사"와 "#선암사 "가 다른 태그가 되어
// 태그 페이지가 쪼개진다.

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 20;

// 태그 한 개 정리. 쓸 수 없는 값이면 빈 문자열.
function normalizeTag(raw: string): string {
  return raw
    .replace(/^#+/, "") // 사용자가 습관적으로 붙이는 # 제거
    .replace(/\s+/g, " ") // 안쪽 연속 공백은 하나로 ("유네스코  세계유산")
    .trim()
    .slice(0, MAX_TAG_LENGTH);
}

// 입력창 문자열 → 태그 배열.
// 쉼표로 나눈다. 태그 자체에 띄어쓰기가 들어가는 경우가 많아서
// ("유네스코 세계유산", "소개팅 프로그램) 공백으로는 나누지 않는다.
export function parseTags(input: string | null | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  for (const piece of input.split(",")) {
    const tag = normalizeTag(piece);
    if (!tag) continue;
    if (out.includes(tag)) continue; // 같은 글에 같은 태그 두 번은 무의미
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

// 태그 배열 → 입력창에 되돌려 넣을 문자열.
export function tagsToInput(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}

// DB에서 온 값 정리. text[] 컬럼이지만 null이 올 수 있고(구 기사),
// 값이 섞여 들어왔을 때 화면이 깨지지 않게 여기서 한 번 거른다.
export function toTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map(normalizeTag)
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

// 태그 → 주소. 한글·공백이 들어가므로 반드시 인코딩한다.
export function tagHref(tag: string): string {
  return `/tag/${encodeURIComponent(tag)}`;
}
