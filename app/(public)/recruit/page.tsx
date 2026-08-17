import Link from "next/link";
import RecruitForm from "@/components/RecruitForm";
import { FEATURES } from "@/lib/features";

export const metadata = {
  title: FEATURES.recruit ? "기자 모집 · 해룡신문" : "기자 모집 안내 · 해룡신문",
  alternates: { canonical: "/recruit" },
  // 모집을 내린 동안은 색인시키지 않는다. 검색에서 들어온 사람에게 빈
  // 안내문만 보여주면 검색 결과의 질을 우리 손으로 떨어뜨리는 셈이다.
  ...(FEATURES.recruit ? {} : { robots: { index: false, follow: true } }),
};

export default function RecruitPage() {
  // 모집을 내렸을 때 — 주소를 아는 사람이 들어올 수 있으므로 폼 대신 안내를
  // 둔다. 신청칸을 그대로 두고 단추만 감추면, 넣어도 받지 않는 신청서를
  // 계속 쓰게 만든다.
  if (!FEATURES.recruit) {
    return (
      <div className="px-[18px] py-6">
        <h1 className="text-[27px] font-extrabold leading-snug">
          시민기자 모집을 잠시 쉽니다
        </h1>
        <p className="mt-3 text-[18px] leading-relaxed text-muted">
          지금은 새 시민기자를 받지 않고 있습니다. 다시 모집할 때 홈 화면에
          안내하겠습니다.
        </p>
        <p className="mt-3 text-[18px] leading-relaxed text-muted">
          그동안에도 동네 소식은 언제든 받습니다. 제보해 주시면 취재해
          기사로 싣겠습니다.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/tips"
            className="flex min-h-[52px] items-center justify-center rounded-element bg-rose-deep text-[18px] font-bold text-white"
          >
            기사 제보하기
          </Link>
          <Link
            href="/"
            className="flex min-h-[52px] items-center justify-center rounded-element border border-line bg-white text-[18px] font-bold text-muted"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[18px] py-6">
      <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[16px] font-bold tracking-wide text-rose">
        함께할 시민기자를 찾습니다
      </span>
      <h1 className="mt-3 text-[27px] font-extrabold leading-snug">
        해룡면 소식, 직접 전해보세요
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        우리 동네 이야기를 취재하고 기사로 쓰는 시민기자를 모집합니다. 승인 후
        기사 작성 권한이 부여됩니다.
      </p>

      <RecruitForm />
    </div>
  );
}
