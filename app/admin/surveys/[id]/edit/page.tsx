import Link from "next/link";
import { notFound } from "next/navigation";
import SurveyForm from "@/components/admin/SurveyForm";
import { PageHead } from "@/components/admin/ui";
import { getAdminSurvey } from "@/lib/mock/admin-surveys";

export const metadata = { title: "조사 수정 · 관리자" };
export const dynamic = "force-dynamic";

export default async function EditSurveyPage({
  params,
}: {
  params: { id: string };
}) {
  const survey = await getAdminSurvey(params.id);
  if (!survey) notFound();

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="조사 수정"
        sub={
          survey.totalVotes > 0
            ? `이미 ${survey.totalVotes}명이 참여했습니다 — 보기를 바꾸면 그 표의 뜻이 달라집니다`
            : "아직 참여자가 없어 자유롭게 고칠 수 있습니다"
        }
        action={
          <Link href="/admin/surveys" className="text-xs text-muted">
            ‹ 목록
          </Link>
        }
      />
      <SurveyForm survey={survey} />
    </div>
  );
}
