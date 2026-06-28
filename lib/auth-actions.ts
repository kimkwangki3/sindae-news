"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isDemoMode } from "./auth";
import { DEMO_COOKIE, isDemoPersona } from "./mock/auth";

const WEEK = 60 * 60 * 24 * 7;

// 데모 로그인 — .env 미설정 시 페르소나 쿠키를 심어 로그인 상태를 흉내낸다.
// Supabase 설정 시에는 동작하지 않는다(실제 카카오 OAuth 사용).
export async function demoLogin(persona: string): Promise<void> {
  if (!isDemoMode() || !isDemoPersona(persona)) return;
  cookies().set(DEMO_COOKIE, persona, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK,
  });
  redirect("/me");
}

// 로그아웃 — 데모/실제 모두 처리.
export async function logout(): Promise<void> {
  if (isDemoMode()) {
    cookies().delete(DEMO_COOKIE);
  } else {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export interface NicknameState {
  error?: string;
}

// 닉네임 온보딩 — useFormState용 시그니처.
// 데모 모드: 검증만 하고 마이페이지로(저장소 없음). 실제: profiles upsert + 중복확인.
export async function setNickname(
  _prev: NicknameState,
  formData: FormData,
): Promise<NicknameState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim() || null;

  if (nickname.length < 2 || nickname.length > 12) {
    return { error: "닉네임은 2~12자로 입력해 주세요." };
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { error: "한글·영문·숫자·밑줄(_)만 사용할 수 있어요." };
  }

  if (isDemoMode()) {
    // 데모에는 저장소가 없으므로 통과 처리.
    redirect("/me");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 닉네임 중복 확인(본인 제외)
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  if (taken && taken.id !== user.id) {
    return { error: "이미 사용 중인 닉네임이에요." };
  }

  // 최초 가입이면 행이 없을 수 있으므로 upsert. nickname_set_at 기록.
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    nickname,
    neighborhood,
    nickname_set_at: new Date().toISOString(),
  });
  if (error) {
    return { error: "저장 중 문제가 발생했어요. 다시 시도해 주세요." };
  }

  redirect("/me");
}
