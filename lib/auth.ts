import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { DEMO_COOKIE, getDemoUser } from "./mock/auth";
import type { CurrentUser } from "./types";

// .env(Supabase) 설정 여부 — 미설정이면 데모(쿠키) 인증 경로를 사용한다.
export function isDemoMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// 현재 로그인 사용자의 통합 신원(프로필 + 업체 + 단체 소속)을 서버에서 조회.
// 비로그인이면 null. 권한 판정(can())에 그대로 넘긴다.
// cache(): 한 요청 렌더 안에서 여러 번 호출돼도 실제 조회는 1회만(중복 인증/쿼리 방지).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // 셋업 전(.env 미설정): 데모 쿠키가 있으면 해당 페르소나로, 없으면 비로그인.
  if (isDemoMode()) {
    return getDemoUser(cookies().get(DEMO_COOKIE)?.value);
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, nickname, neighborhood, avatar_url, role, reporter_level, is_suspended, deleted_at",
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  // 본인 업체(1인 1개)
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, status")
    .eq("owner_id", user.id)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  // 가입 단체 목록
  const { data: orgRows } = await supabase
    .from("org_members")
    .select("org_id, role, status, organizations(name)")
    .eq("user_id", user.id);

  const orgs = (orgRows ?? []).map((r) => ({
    org_id: r.org_id as string,
    role: r.role as CurrentUser["orgs"][number]["role"],
    status: r.status as CurrentUser["orgs"][number]["status"],
    // 조인 결과(타입 생성 전이라 any 우회)
    name:
      (r as unknown as { organizations?: { name?: string } }).organizations
        ?.name ?? "",
  }));

  return {
    ...(profile as Omit<CurrentUser, "business" | "orgs">),
    business: business ?? null,
    orgs,
  };
});
