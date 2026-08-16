import Link from "next/link";
import { notFound } from "next/navigation";
import LoginRequired from "@/components/community/LoginRequired";
import OrgEditForm from "@/components/orgs/OrgEditForm";
import { getCurrentUser } from "@/lib/auth";
import { getOrg, ORG_CAT_NAME } from "@/lib/mock/orgs";
import { can } from "@/lib/permissions";

export const metadata = {
  title: "단체 정보 수정 · 지역단체",
  robots: { index: false, follow: true },
};

export default async function OrgEditPage({
  params,
}: {
  params: { id: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();

  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="단체 정보 수정은 로그인 후 가능합니다" />;

  // 가입 관리와 같은 기준(그 단체의 owner·staff). 화면을 막는 것은 안내일 뿐이고,
  // 실제 차단은 서버 액션과 RLS가 한다.
  if (!can(user, "approve_member", { orgId: org.id })) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          단체 정보는 <b>그 단체 운영진</b>만 수정할 수 있어요.
        </p>
        <Link href={`/orgs/${org.id}`} className="text-sm text-rose-deep">
          단체로 돌아가기 ›
        </Link>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl text-rose-deep">단체 정보 수정</h1>
          <p className="mt-0.5 text-xs text-muted">{org.name}</p>
        </div>
        <Link href={`/orgs/${org.id}`} className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>

      <OrgEditForm
        orgId={org.id}
        orgName={org.name}
        cats={Object.entries(ORG_CAT_NAME)}
        initial={{
          category: org.category,
          leader: org.leader,
          region: org.region,
          contact: org.contact,
          kakaoChannel: org.kakaoChannel,
          acceptJoin: org.acceptJoin,
          intro: org.intro,
          photos: org.photos,
        }}
      />
    </div>
  );
}
