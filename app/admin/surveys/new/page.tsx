import Link from "next/link";
import SurveyForm from "@/components/admin/SurveyForm";
import { PageHead } from "@/components/admin/ui";

export const metadata = { title: "새 주민 의견 조사 · 관리자" };

export default function NewSurveyPage() {
  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="새 조사"
        sub="초안으로 저장한 뒤 검토하고 진행을 시작하세요"
        action={
          <Link href="/admin/surveys" className="text-xs text-muted">
            ‹ 목록
          </Link>
        }
      />
      <SurveyForm />
    </div>
  );
}
