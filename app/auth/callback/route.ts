import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 카카오 OAuth 콜백. code → 세션 교환 후, 닉네임 미설정(신규)이면 온보딩으로 보낸다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 오픈 리다이렉트 방지: 같은 사이트 내부 경로(/...)만 허용. "//"·외부 URL 차단.
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // 신규 가입(닉네임 미설정)이거나, 거주 지역이 비어 있으면 온보딩으로 보낸다.
  // 지역을 필수로 받기 전에 가입한 회원도 한 번은 답하게 하려는 것.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname_set_at, neighborhood")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.nickname_set_at || !profile?.neighborhood) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
