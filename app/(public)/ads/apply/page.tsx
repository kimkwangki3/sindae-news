import Link from "next/link";
import AdApplyForm from "@/components/AdApplyForm";
import LoginRequired from "@/components/community/LoginRequired";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "배너 광고 신청 · 신대신문" };

export default async function AdApplyPage() {
  const user = await getCurrentUser();

  // 로그인 필수
  if (!user) {
    return <LoginRequired message="광고 신청은 로그인 후 가능합니다" />;
  }

  // 업체 등록 필수
  if (!user.business) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-2xl">🏪</p>
        <p className="text-sm leading-relaxed text-muted">
          배너 광고는 <b className="text-rose-deep">업체 등록</b>을 한 회원만
          신청할 수 있어요.
          <br />
          먼저 업체를 등록해 주세요.
        </p>
        <Link
          href="/district/business/register"
          className="flex min-h-[48px] items-center rounded-element bg-rose-deep px-6 text-sm font-bold text-white"
        >
          업체 등록하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">배너 광고 신청</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        신대신문에 배너 광고를 신청하세요. 지역 주민에게 노출됩니다.
      </p>
      <p className="mt-1 text-xs text-muted">
        신청 업체: <b>{user.business.name}</b>
      </p>
      <AdApplyForm />
    </div>
  );
}
