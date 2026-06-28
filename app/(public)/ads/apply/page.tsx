import AdApplyForm from "@/components/AdApplyForm";

export const metadata = { title: "배너 광고 신청 · 신대신문" };

export default function AdApplyPage() {
  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">배너 광고 신청</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        신대신문에 배너 광고를 신청하세요. 지역 주민에게 노출됩니다.
      </p>
      <AdApplyForm />
    </div>
  );
}
