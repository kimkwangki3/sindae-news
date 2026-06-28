import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LoginRequired from "@/components/community/LoginRequired";
import OrgJoinForm from "@/components/orgs/OrgJoinForm";
import { getOrg } from "@/lib/mock/orgs";

export const metadata = { title: "가입 신청 · 지역단체" };

export default async function OrgJoinPage({
  params,
}: {
  params: { id: string };
}) {
  const org = await getOrg(params.id);
  if (!org) notFound();
  if (!org.acceptJoin) redirect(`/orgs/${org.id}`);

  const user = await getCurrentUser();
  if (!user) return <LoginRequired message="가입 신청은 로그인 후 가능합니다" />;

  return (
    <div className="px-[18px] py-5">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">가입 신청</h1>
        <Link href={`/orgs/${org.id}`} className="text-xs text-muted">
          ‹ 단체
        </Link>
      </div>
      <OrgJoinForm orgId={org.id} orgName={org.name} />
    </div>
  );
}
