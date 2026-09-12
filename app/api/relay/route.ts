// 취재 자료 중계 — 서울 리전 전용.
//
// 시청 서버가 해외 IP 요청에는 응답하지 않는다(GitHub Actions 러너에서 두 게시판
// 모두 시간 초과). 초안 생성은 GitHub에서 돌아야 하므로, 읽는 일만 한국에 있는
// 이 라우트가 대신한다. preferredRegion으로 서울(icn1)에 고정한다.
// 사건사고를 참고하는 언론사 사이트도 같은 이유로 여기를 거친다.
//
// 열린 프록시가 되지 않도록 두 가지를 건다:
//   1) 중계 대상 도메인을 아래 목록으로 못 박는다(SSRF 차단)
//   2) 비밀값을 아는 호출만 받는다 — 웹훅과 같은 값을 쓴다

export const runtime = "edge";
export const preferredRegion = ["icn1"];
export const dynamic = "force-dynamic";

// 읽어도 되는 곳만. 여기 없는 주소는 403으로 막는다.
//   · 순천시청 — www 와 m 두 호스트를 쓴다(게시판에 따라 다르다)
//   · 언론사 — automation/news.mjs 의 FEEDS 와 짝이다. 한쪽만 고치면 막힌다.
const ALLOWED_HOSTS = [
  "www.suncheon.go.kr",
  "m.suncheon.go.kr",
  "news.google.com",
  "www.yna.co.kr",
  "www.jnilbo.com",
  "www.namdonews.com",
  "www.agoranews.kr",
  "www.gjdream.com",
  "newsis.com",
  "www.newsis.com",
  "news.sbs.co.kr",
];

// 엣지 함수는 25초 안에 응답을 시작해야 한다. 그보다 앞서 끊는다.
const UPSTREAM_TIMEOUT_MS = 20000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0 Safari/537.36 (haeryongnews-bot; +https://www.sdtime.net)";

function fail(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function authorized(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  return Boolean(secret) && req.headers.get("x-relay-secret") === secret;
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return fail("권한이 없습니다", 401);

  const target = new URL(req.url).searchParams.get("url");
  if (!target) return fail("url 파라미터가 없습니다", 400);

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return fail("url 형식이 올바르지 않습니다", 400);
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return fail(`중계할 수 없는 도메인입니다: ${parsed.hostname}`, 403);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return fail("http/https만 중계합니다", 403);
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,*/*",
        "accept-language": "ko-KR,ko;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return fail(`${parsed.hostname} 응답 ${res.status}`, 502);

    // 본문을 그대로 넘긴다. 파싱은 호출한 쪽(collect.mjs / news.mjs)이 한다.
    return new Response(await res.text(), {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "중계 실패", 504);
  }
}

// 보도자료 첨부사진 내려받기 — 대표 이미지용(automation/collect.mjs downloadPhoto).
//
// 시청 게시판의 첨부는 링크가 아니라 폼 전송(POST)이고, 받는 서버가 따로 있다.
// 위 GET과 달리 본문을 글자로 바꾸지 않고 바이트 그대로 넘긴다.
// 열린 프록시가 되지 않도록 대상은 이 주소 하나로 못 박는다.
const DOWNLOAD_HOST = "eminwon.suncheon.go.kr";
const DOWNLOAD_PATH = "/emwp/jsp/ofr/FileDownNew.jsp";
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) return fail("권한이 없습니다", 401);

  let parsed: URL;
  try {
    parsed = new URL(new URL(req.url).searchParams.get("url") ?? "");
  } catch {
    return fail("url 형식이 올바르지 않습니다", 400);
  }
  if (parsed.hostname !== DOWNLOAD_HOST || parsed.pathname !== DOWNLOAD_PATH) {
    return fail("첨부 내려받기만 중계합니다", 403);
  }
  // 게시판 폼은 http로 보내지만 엣지 런타임은 http를 못 쓴다. 같은 서버가
  // https로도 받는다(확인함).
  parsed.protocol = "https:";

  const form = await req.text();
  if (form.length > 4000) return fail("요청이 너무 큽니다", 400);

  try {
    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: {
        "user-agent": UA,
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://m.suncheon.go.kr/",
      },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return fail(`${parsed.hostname} 응답 ${res.status}`, 502);

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_DOWNLOAD_BYTES) return fail("파일이 너무 큽니다", 502);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "중계 실패", 504);
  }
}
