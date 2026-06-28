import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import LoginRequired from "@/components/community/LoginRequired";
import OrgMemberManager from "@/components/orgs/OrgMemberManager";
import { getOrg } from "@/lib/mock/orgs";

export const metadata = { title: "가입 관리 · 지역단체" };

export default async function OrgManagePage({
  params,
}: {
  params: { id: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();

  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="가입 관리는 로그인 후 가능합니다" />;

  if (!can(user, "approve_member", { orgId: org.id })) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm leading-relaxed text-muted">
          가입 관리는 <b>단체 운영진</b>만 접근할 수 있어요.
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
          <h1 className="text-xl text-rose-deep">가입 관리</h1>
          <p className="mt-0.5 text-xs text-muted">{org.name}</p>
        </div>
        <Link href={`/orgs/${org.id}`} className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>

      <OrgMemberManager
        orgId={org.id}
        pending={org.pending}
        members={org.members}
      />
    </div>
  );
}
