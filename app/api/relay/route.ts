// 순천시청 자료 중계 — 서울 리전 전용.
//
// 시청 서버가 해외 IP 요청에는 응답하지 않는다(GitHub Actions 러너에서 두 게시판
// 모두 시간 초과). 초안 생성은 GitHub에서 돌아야 하므로, 읽는 일만 한국에 있는
// 이 라우트가 대신한다. preferredRegion으로 서울(icn1)에 고정한다.
//
// 열린 프록시가 되지 않도록 두 가지를 건다:
//   1) 중계 대상 도메인을 순천시청 하나로 못 박는다(SSRF 차단)
//   2) 비밀값을 아는 호출만 받는다 — 웹훅과 같은 값을 쓴다

export const runtime = "edge";
export const preferredRegion = ["icn1"];
export const dynamic = "force-dynamic";

const ALLOWED_HOST = "www.suncheon.go.kr";

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

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-relay-secret") !== secret) {
    return fail("권한이 없습니다", 401);
  }

  const target = new URL(req.url).searchParams.get("url");
  if (!target) return fail("url 파라미터가 없습니다", 400);

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return fail("url 형식이 올바르지 않습니다", 400);
  }
  if (parsed.hostname !== ALLOWED_HOST) {
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
    if (!res.ok) return fail(`시청 서버 응답 ${res.status}`, 502);

    // 본문을 그대로 넘긴다. 파싱은 호출한 쪽(collect.mjs)이 한다.
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
