"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/auth";
import { getIpHash } from "@/lib/ip";

// 방문자 구분 쿠키. 기사 조회수처럼 IP만으로 세면 같은 아파트·회사에서 온
// 여러 명이 한 명으로 뭉개진다. 사람을 특정하는 값이 아니라 무작위 UUID다.
// 심는 곳은 middleware.ts — 여기서는 읽기만 한다.
const VISITOR_COOKIE = "hn_vid";

// 검색엔진·모니터링 봇은 "접속한 주민"이 아니다. 걸러내지 않으면
// 색인이 도는 날 방문자 수가 통째로 부풀어 숫자를 믿을 수 없게 된다.
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|pingdom|lighthouse|headless|curl|wget|python-requests|axios|okhttp/i;

// 유입 경로는 브라우저가 알려준 값만 쓴다.
//
// 서버의 Referer 헤더를 쓰면 안 된다. 이 함수는 서버 액션이라, 그 헤더에는
// "어디서 왔는가"가 아니라 "지금 보고 있는 우리 페이지"가 담긴다. 그래서
// 유입 경로가 전부 sdtime.net 으로 찍혀 있었다 — 474건 중 바깥에서 온
// 기록이 한 건도 없었다. 카카오톡에서 열든 구글에서 오든 똑같았다.
//
// 브라우저가 보낸 값이므로 믿을 수 없는 입력이다. 길이를 자르고, 화면에는
// 호스트만 뽑아 쓴다(top_referrers). 접속 통계라 위험도는 낮지만 원문을
// 그대로 어딘가에 흘리지는 않는다.
function cleanReferrer(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || !/^https?:\/\//i.test(s)) return null;
  return s.slice(0, 300);
}

// 공개 페이지 방문 1건 기록 — VisitTracker(클라이언트)가 경로가 바뀔 때 호출.
// 화면을 막지 않는 부수 작업이라 실패해도 조용히 지나간다(로그만 남긴다).
export async function trackVisit(
  rawPath: string,
  referrer?: string,
): Promise<void> {
  if (isDemoMode()) return; // .env 미설정 — 기록할 곳이 없다

  const ua = headers().get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;

  const path = rawPath.split("?")[0].slice(0, 200);
  if (!path.startsWith("/")) return;

  // 쿠키가 없으면 새로 만들지 않는다. 여기서 UUID를 새로 뽑으면 쿠키가
  // 저장되지 않는 방문자는 페이지를 볼 때마다 새 방문자로 세어진다 —
  // 실제로 그렇게 부풀려지고 있었다. 없을 땐 null로 두고 집계 함수가
  // ip_hash로 대신 세게 한다(coalesce, page-views-migration.sql).
  const raw = cookies().get(VISITOR_COOKIE)?.value;
  const vid = raw && raw.length === 36 ? raw : null;

  // 누가 읽었는지는 남기지 않는다.
  //
  // 전에는 로그인한 사람의 user_id 를 함께 넣었다. 그런데 그 값을 읽는 화면이
  // 하나도 없었다 — 쓰지도 않으면서 "이 회원이 언제 어느 기사를 봤는가"만
  // 기한 없이 쌓고 있었던 셈이다. 지우는 장치도 없었다.
  // 방문자 수는 session_id(무작위 쿠키)와 ip_hash 로 이미 세어진다.
  const supabase = createClient();
  const { error } = await supabase.from("page_views").insert({
    path,
    ip_hash: getIpHash(),
    session_id: vid,
    referrer: cleanReferrer(referrer),
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[visit] page_views 기록 실패:", error.message);
  }
}
