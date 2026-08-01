import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MEDIA } from "@/lib/media";

// 가입 직후 화면 — 카카오톡 채널 추가를 권한다.
//
// 원래는 카카오싱크가 가입 동의 화면에서 채널 추가를 함께 받아준다. 그런데
// 카카오싱크는 비즈니스 채널 인증과 심사를 통과해야 켤 수 있어 아직 못 쓴다.
// 그때까지는 가입이 막 끝난 이 순간에 직접 권하는 것이 가장 효과가 크다.
// 카카오싱크가 열리면 이 화면은 없애도 된다.

export const metadata = { robots: { index: false, follow: false } };

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <main className="px-[18px] py-10">
      <p className="text-[18px] font-bold text-rose">가입을 마쳤습니다</p>
      <h1 className="mt-2 font-serif text-[31px] leading-snug text-ink">
        {user.nickname ?? "이웃"}님, 반갑습니다
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        해룡면 신대·복성·선월지구 소식을 가장 가까운 자리에서 전하겠습니다.
      </p>

      <section className="mt-8 rounded-card border border-line bg-ivory-2 p-5">
        <p className="text-[20px] font-bold text-ink">
          카카오톡 채널도 추가해 두세요
        </p>
        <p className="mt-2 text-[18px] leading-relaxed text-muted">
          {MEDIA.name} 소식을 카카오톡에서도 보실 수 있습니다. 한 번만
          누르시면 됩니다.
        </p>
        <a
          href={MEDIA.kakaoChannelAdd}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-[52px] items-center justify-center rounded-element bg-[#FEE500] text-[20px] font-bold text-[#191600]"
        >
          카카오톡 채널 추가하기
        </a>
      </section>

      <Link
        href="/me"
        className="mt-4 flex min-h-[52px] items-center justify-center rounded-element border border-line text-sm text-muted"
      >
        나중에 하기
      </Link>
    </main>
  );
}
