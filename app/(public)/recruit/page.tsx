import RecruitForm from "@/components/RecruitForm";

export const metadata = { title: "기자 모집 · 신대신문" };

export default function RecruitPage() {
  return (
    <div className="px-[18px] py-6">
      <span className="inline-block rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-rose">
        함께할 시민기자를 찾습니다
      </span>
      <h1 className="mt-3 text-[22px] font-extrabold leading-snug">
        신대지구 소식, 직접 전해보세요
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        우리 동네 이야기를 취재하고 기사로 쓰는 시민기자를 모집합니다. 승인 후
        기사 작성 권한이 부여됩니다.
      </p>

      <RecruitForm />
    </div>
  );
}
