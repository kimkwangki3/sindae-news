import Link from "next/link";
import { notFound } from "next/navigation";
import LoginRequired from "@/components/community/LoginRequired";
import BusinessEditForm from "@/components/district/BusinessEditForm";
import { getCurrentUser } from "@/lib/auth";
import { BIZ_CAT_NAME, getBusinessForEdit } from "@/lib/mock/district";

export const metadata = {
  title: "업체 정보 수정 · 해룡상권",
  robots: { index: false, follow: true },
};

export default async function BusinessEditPage({
  params,
}: {
  params: { id: string };
}) {
  const biz = await getBusinessForEdit(params.id);
  if (!biz) notFound();

  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="업체 정보 수정은 로그인 후 가능합니다" />;

  // 승인 전이어도 본인 업체면 고칠 수 있다. 화면 가드는 안내일 뿐이고
  // 실제 차단은 서버 액션과 RLS(owner_id = auth.uid())가 한다.
  const mine = user.businesses.some((b) => b.id === biz.id);
  if (!mine) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          업체 정보는 <b>등록한 사장님</b>만 수정할 수 있어요.
        </p>
        <Link href={`/district/${biz.id}`} className="text-sm text-rose-deep">
          업체로 돌아가기 ›
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl text-rose-deep">업체 정보 수정</h1>
          <p className="mt-0.5 text-xs text-muted">{biz.name}</p>
        </div>
        <Link href={`/district/${biz.id}`} className="text-xs text-muted">
          ‹ 업체
        </Link>
      </div>

      {biz.bizVerifiedAt && (
        <p className="mb-3 rounded-element border border-line bg-white px-3.5 py-2.5 text-[17px] text-muted">
          ✓ 사업자등록 확인이 끝난 업체입니다. 상호·사업자등록번호를 바꾸려면
          해룡신문에 문의해 주세요.
        </p>
      )}

      <BusinessEditForm biz={biz} cats={Object.entries(BIZ_CAT_NAME)} />
    </div>
  );
}
