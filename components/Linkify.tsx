import type { ReactNode } from "react";

// 본문 글자 속의 주소를 링크로 바꾼다 — 기사·게시판 공용.
//
// 본문은 HTML로 해석하지 않는다(PostBody 주석 참고). 그래서 기자가 주소를 적어도
// 글자로만 남아 있었고, 독자는 긴 주소를 손으로 옮겨 적어야 했다.
//
// 보안 — 여기서 만드는 것은 <a> 하나뿐이고, href 에는 우리가 직접 훑어 찾아낸
// http/https 주소만 들어간다. javascript: 같은 스킴은 정규식이 아예 집지 않으므로
// 주소 자리에 코드를 심을 경로가 없다. 바깥으로 나가는 링크이므로 새 탭 +
// noopener 로 원래 창을 넘겨주지 않는다.
//
// 주소 글자는 ASCII 만 쓴다. 그래서 문자 집합에서 한글을 빼두면
// "…forms/d/e/1FA…를 눌러" 처럼 조사가 붙어 있어도 주소만 정확히 끊긴다.
const URL_RE = /(?:https?:\/\/|www\.)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

// 문장 끝의 마침표·괄호는 주소가 아니다. "(https://a.b/c)" 나 "https://a.b/c."
// 처럼 쓰는 일이 흔해서, 뒤에 붙은 구두점은 링크에서 떼어낸다.
const TRAILING = /[.,;:!?)\]}"'’”…]+$/;

// 화면에 보일 글자. 스킴은 지우고(신문에서 http:// 를 읽을 이유가 없다),
// 그래도 길면 줄인다 — 90자짜리 설문 주소가 본문 한가운데서 석 줄을 먹으면
// 기사가 읽히지 않는다. 누르면 원래 주소로 가고, 길게 눌러 복사하면 전문이 나온다.
const MAX_LABEL = 46;

function label(url: string): string {
  const bare = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return bare.length > MAX_LABEL ? `${bare.slice(0, MAX_LABEL)}…` : bare;
}

/**
 * 글자 → 링크가 섞인 노드. 주소가 없으면 원래 문자열을 그대로 돌려준다
 * (배열로 감싸지 않아야 whitespace-pre-line 의 줄바꿈이 그대로 산다).
 */
export default function linkify(text: string): ReactNode {
  const re = new RegExp(URL_RE.source, "g");
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const url = m[0].replace(TRAILING, "");
    // 구두점을 떼어낸 만큼 되감아, 그 뒤 글자는 본문으로 다시 흐르게 한다.
    re.lastIndex = m.index + url.length;
    // 점이 없으면 도메인이 아니다("https://" 같은 껍데기).
    if (!url.includes(".")) continue;

    const href = url.startsWith("www.") ? `https://${url}` : url;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a
        key={m.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        // 주소는 띄어쓰기가 없어 통째로 한 낱말이다. break-all 이 없으면
        // 화면 밖으로 삐져나가 본문 전체가 옆으로 밀린다.
        className="break-all text-body-blue underline underline-offset-2"
        title={url}
      >
        {label(url)}
      </a>,
    );
    last = re.lastIndex;
  }

  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}
