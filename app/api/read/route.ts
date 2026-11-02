import { NextResponse } from "next/server";
import { trackArticleView } from "@/app/(public)/articles/actions";

// 읽음 기록 수신 — ReadTracker 가 화면을 떠날 때 sendBeacon 으로 보낸다.
//
// 서버 액션으로 보내면 페이지가 닫히면서 요청이 끊긴다. 휴대폰에서 특히 그래서
// 2026-11-02 기준 한 기사가 방문 46회에 읽음 기록 12건만 남아 있었다.
// sendBeacon 은 페이지가 닫혀도 브라우저가 끝까지 보내 주지만, 서버 액션을
// 부를 수는 없어 이 주소를 따로 둔다.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    slug?: unknown;
    scrollPct?: unknown;
    dwellMs?: unknown;
  } | null;

  const { slug, scrollPct, dwellMs } = body ?? {};
  if (
    typeof slug !== "string" ||
    !slug ||
    slug.length > 200 ||
    typeof scrollPct !== "number" ||
    typeof dwellMs !== "number"
  ) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  await trackArticleView({ slug, scrollPct, dwellMs });
  return new NextResponse(null, { status: 204 });
}
