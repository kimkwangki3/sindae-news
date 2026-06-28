import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { canWriteArticle, articleStatusOnSubmit } from "@/lib/permissions";
import ReporterWriteForm from "@/components/reporter/ReporterWriteForm";

export const metadata = { title: "기사 작성 · 기자 공간" };

export default async function ReporterWritePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!canWriteArticle(user)) {
    return (
      <div className="px-[18px] py-10 text-center">
        <p className="text-sm leading-relaxed text-muted">
          아직 기사 작성 권한이 없습니다.
          <br />
          관리자 승인(준기자/정기자) 후 작성할 수 있어요.
        </p>
        <Link
          href="/reporter"
          className="mt-4 inline-block text-sm font-bold text-rose-deep"
        >
          ‹ 대시보드
        </Link>
      </div>
    );
  }

  const publishLabel =
    articleStatusOnSubmit(user) === "published" ? "발행하기" : "승인 요청";

  return (
    <div className="px-[18px] py-5">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-rose-deep">기사 작성</h1>
        <Link href="/reporter" className="text-xs text-muted">
          ‹ 대시보드
        </Link>
      </div>
      <ReporterWriteForm publishLabel={publishLabel} />
    </div>
  );
}
