// 기사 슬러그(URL). 관리자 에디터와 초안 발행이 같은 규칙을 쓴다.
//
// 자동 생성은 한국 날짜 + 그날의 순번이다: 20260801-1, 20260801-2 …
// 짧아서 카카오톡·문자로 나눠도 링크가 깨지지 않고, 날짜가 보여 정리하기 쉽다.
//
// 제목에서 슬러그를 만들지 않는다. 한글이 전부 걸러지는 바람에
// "…추가 모집, 8월 31일까지" 가 "8-31" 이 되는 식으로 뜻 없는 주소가 나왔다.

import { createServiceClient } from "./supabase/server";

// 사람이 직접 입력한 슬러그를 다듬는다. 쓸 수 없으면 빈 문자열을 준다 —
// 자동 생성으로 넘길지는 부르는 쪽이 정한다.
export function normalizeSlug(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // 영문자가 하나도 없으면 한글 제목에서 숫자만 남은 찌꺼기로 본다.
  return s.length >= 2 && /[a-z]/.test(s) ? s : "";
}

// 서버는 UTC로 돈다. 한국 날짜로 번호를 매겨야 새벽에 발행한 기사가
// 전날 날짜로 밀리지 않는다.
function seoulYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
}

// 오늘 날짜의 다음 순번을 붙인 슬러그.
export async function nextArticleSlug(): Promise<string> {
  const ymd = seoulYmd();
  const { data } = await createServiceClient()
    .from("articles")
    .select("slug")
    .like("slug", `${ymd}-%`);

  const pattern = new RegExp(`^${ymd}-(\\d+)$`);
  let max = 0;
  for (const row of (data ?? []) as { slug: string }[]) {
    const m = pattern.exec(row.slug);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${ymd}-${max + 1}`;
}
