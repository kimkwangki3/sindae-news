import Link from "next/link";
import TipForm from "@/components/community/TipForm";
import { getCurrentUser } from "@/lib/auth";
import { TIP_DAILY_LIMIT } from "@/lib/tips";

export const metadata = { title: "제보하기 · 해룡신문" };

// 제보는 로그인한 사람만 보낼 수 있다. 사실관계를 되물으려면 연락이 닿아야 하고,
// 익명 제보는 남용을 막을 방법이 없다.
export default async function TipsPage() {
  const user = await getCurrentUser();

  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">제보하기</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        해룡면 소식·제보를 보내주세요.
        <br />
        확인 후 기사에 반영하거나 직접 연락드립니다.
      </p>

      {user ? (
        <TipForm />
      ) : (
        <div className="mt-6 rounded-card border border-line bg-ivory-2 p-5">
          <p className="text-[15px] font-bold text-ink">
            카카오 로그인 후 제보하실 수 있습니다
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            제보 내용을 확인하려면 편집국에서 연락을 드려야 합니다. 그래서
            누구신지 확인되는 분께만 제보를 받고 있습니다. 제보는 하루{" "}
            {TIP_DAILY_LIMIT}건까지 보내실 수 있습니다.
          </p>
          <Link
            href="/login"
            className="mt-4 flex min-h-[52px] items-center justify-center rounded-element bg-rose-deep text-[15px] font-bold text-white"
          >
            카카오로 로그인
          </Link>
        </div>
      )}
    </div>
  );
}
