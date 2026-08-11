"use server";

import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/auth";
import { getIpHash } from "@/lib/ip";

// 방문자 구분 쿠키. 기사 조회수처럼 IP만으로 세면 같은 아파트·회사에서 온
// 여러 명이 한 명으로 뭉개진다. 사람을 특정하는 값이 아니라 무작위 UUID다.
const VISITOR_COOKIE = "hn_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180; // 180일

// 검색엔진·모니터링 봇은 "접속한 주민"이 아니다. 걸러내지 않으면
// 색인이 도는 날 방문자 수가 통째로 부풀어 숫자를 믿을 수 없게 된다.
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|monitor|pingdom|lighthouse|headless|curl|wget|python-requests|axios|okhttp/i;

// 공개 페이지 방문 1건 기록 — VisitTracker(클라이언트)가 경로가 바뀔 때 호출.
// 화면을 막지 않는 부수 작업이라 실패해도 조용히 지나간다(로그만 남긴다).
export async function trackVisit(rawPath: string): Promise<void> {
  if (isDemoMode()) return; // .env 미설정 — 기록할 곳이 없다

  const ua = headers().get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;

  const path = rawPath.split("?")[0].slice(0, 200);
  if (!path.startsWith("/")) return;

  const jar = cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  const vid = existing && existing.length === 36 ? existing : randomUUID();

  // 올 때마다 만료를 미뤄 준다 — 자주 오는 주민이 6개월마다 새 방문자로
  // 세지 않도록.
  try {
    jar.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_MAX_AGE,
    });
  } catch {
    // 쿠키를 쓸 수 없는 컨텍스트 — 기록 자체는 계속한다.
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("page_views").insert({
    path,
    ip_hash: getIpHash(),
    session_id: vid,
    referrer: headers().get("referer")?.slice(0, 300) ?? null,
    user_id: user?.id ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[visit] page_views 기록 실패:", error.message);
  }
}
