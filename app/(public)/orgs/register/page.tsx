import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LoginRequired from "@/components/community/LoginRequired";
import OrgRegisterForm from "@/components/orgs/OrgRegisterForm";
import { ORG_CAT_NAME } from "@/lib/mock/orgs";

export const metadata = {
  title: "지역단체 등록 · 해룡신문",
  robots: { index: false, follow: true },
};

export default async function OrgRegisterPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="단체 등록은 로그인 후 가능합니다" />;

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">지역단체 등록</h1>
        <Link href="/orgs" className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        우리 단체를 등록하고 승인받으면 소개 페이지와 소식 글을 운영할 수 있어요.
      </p>

      <OrgRegisterForm cats={Object.entries(ORG_CAT_NAME)} />
    </div>
  );
}
