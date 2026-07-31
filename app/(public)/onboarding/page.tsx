import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "닉네임 설정 · 해룡신문" };

// 카카오 로그인 직후: 닉네임(중복확인)·거주 지역 설정.
// 지역을 필수로 받기 전에 가입한 회원도 여기로 다시 오므로, 이미 정한
// 닉네임은 채워 두고 지역만 고르면 되게 한다.
// 신규 가입자는 아직 profiles 행이 없을 수 있어 getCurrentUser 대신 인증 세션만 확인한다.
export default async function OnboardingPage() {
  let nickname = "";
  if (!isDemoMode()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();
    nickname = (profile as { nickname?: string } | null)?.nickname ?? "";
  }

  const returning = Boolean(nickname);

  return (
    <div className="px-7 pb-12 pt-10">
      <h1 className="text-xl text-rose-deep">
        {returning ? "한 가지만 더요 🙌" : "반가워요! 👋"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {returning ? (
          <>
            어느 동네에 사시는지 알려주세요. <br />
            사시는 곳에 맞는 소식을 전해드릴게요.
          </>
        ) : (
          <>
            해룡신문에서 사용할 닉네임을 정해주세요. <br />
            댓글·게시글에 이 이름이 표시돼요.
          </>
        )}
      </p>
      <OnboardingForm defaultNickname={nickname} />
    </div>
  );
}
