import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "닉네임 설정 · 신대신문" };

// 카카오 로그인 직후 최초 1회: 닉네임(중복확인)·동네 설정.
// 신규 가입자는 아직 profiles 행이 없을 수 있어 getCurrentUser 대신 인증 세션만 확인한다.
export default async function OnboardingPage() {
  if (!isDemoMode()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <div className="px-7 pb-12 pt-10">
      <h1 className="text-xl text-rose-deep">반가워요! 👋</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        신대신문에서 사용할 닉네임을 정해주세요. <br />
        댓글·게시글에 이 이름이 표시돼요.
      </p>
      <OnboardingForm />
    </div>
  );
}
