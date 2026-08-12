import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 방문자 구분 쿠키. 사람을 특정하는 값이 아니라 무작위 UUID다.
// lib/visit-actions.ts 가 이 값을 읽어 page_views.session_id 로 남긴다.
const VISITOR_COOKIE = "hn_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180; // 180일

// 방문자 쿠키를 여기서 심는 이유.
//
// 전에는 방문 기록 서버 액션 안에서 cookies().set() 으로 심었는데, 일부
// 방문자에게는 그게 브라우저에 남지 않았다. 남지 않으면 페이지를 볼 때마다
// 새 UUID가 생기고 그게 곧 새 방문자로 세어진다 — 실제로 한 사람이 생활정보
// 세 쪽을 차례로 본 것이 방문자 3명으로 잡혀 있었다.
//
// 미들웨어는 모든 요청의 응답을 직접 들고 있으므로 Set-Cookie가 확실히 나간다.
// 이미 있으면 건드리지 않는다 — 응답마다 Set-Cookie를 붙이면 캐시가 막힌다.

// 봇은 쿠키를 들고 다니지 않는다. 심어 줘도 쓰이지 않고, sitemap·rss·robots
// 응답이 캐시되지 못하게 막기만 한다.
// (방문 집계에서 봇을 빼는 일은 lib/visit-actions.ts 가 따로 한다)
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|monitor|pingdom|lighthouse|headless|curl|wget|python-requests|axios|okhttp/i;

function ensureVisitorCookie(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  if (existing && existing.length === 36) return;

  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;

  const vid = crypto.randomUUID();
  // 이번 요청의 렌더에서도 같은 값을 읽을 수 있게 양쪽에 넣는다.
  request.cookies.set(VISITOR_COOKIE, vid);
  response.cookies.set(VISITOR_COOKIE, vid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_MAX_AGE,
  });
}

// Supabase 세션 토큰 갱신 (@supabase/ssr 필수). 모든 요청에서 쿠키 동기화.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 환경변수 미설정 시(셋업 전) 그냥 통과 — 빌드/로컬 첫 실행 보호
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    ensureVisitorCookie(request, response);
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()로 토큰 검증 및 갱신
  await supabase.auth.getUser();

  // 위 setAll이 response를 새로 만들 수 있으므로 맨 마지막에 심는다.
  ensureVisitorCookie(request, response);
  return response;
}

export const config = {
  // 정적 파일/이미지 제외 전 경로
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
