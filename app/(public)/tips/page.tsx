import TipForm from "@/components/community/TipForm";

export const metadata = { title: "제보하기 · 신대신문" };

export default function TipsPage() {
  return (
    <div className="px-[18px] py-6">
      <h1 className="text-xl text-rose-deep">제보하기</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        신대지구의 소식·제보를 보내주세요.
        <br />
        확인 후 기사에 반영하거나 직접 연락드립니다.
      </p>
      <TipForm />
    </div>
  );
}
