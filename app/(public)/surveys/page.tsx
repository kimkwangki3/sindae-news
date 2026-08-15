import Link from "next/link";
import { getSurveys } from "@/lib/mock/surveys";
import { remainingLabel, type SurveySummary } from "@/lib/surveys";

export const metadata = {
  title: "주민 의견 조사 · 해룡신문",
  description:
    "해룡면 주민이 직접 답하는 의견 조사. 결과는 해룡신문이 기사로 전합니다.",
  alternates: { canonical: "/surveys" },
};

// 참여 수가 실시간으로 변한다. 목록에 어제 숫자가 떠 있으면 안 된다.
export const dynamic = "force-dynamic";

function Card({ s }: { s: SurveySummary }) {
  const open = s.status === "open";
  const left = remainingLabel(s.endsAt);

  return (
    <Link
      href={`/surveys/${s.slug}`}
      className="flex flex-col gap-1.5 rounded-card border border-line bg-white p-4"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[15px] font-bold ${
            open ? "bg-rose-soft text-rose-deep" : "bg-line text-muted"
          }`}
        >
          {open ? "진행 중" : "종료"}
        </span>
        {open && left && (
          <span className="text-[16px] text-muted">{left}</span>
        )}
      </span>
      <span className="text-[20px] font-bold leading-snug">{s.title}</span>
      <span className="text-[17px] text-muted">
        참여 {s.totalVotes.toLocaleString()}명
      </span>
    </Link>
  );
}

export default async function SurveysPage() {
  const { open, closed } = await getSurveys();

  return (
    <div className="px-[18px] py-5">
      <h1 className="text-[24px] font-extrabold">주민 의견 조사</h1>
      <p className="mt-1.5 text-[18px] leading-relaxed text-muted">
        해룡면에 사는 사람들이 직접 답합니다. 모인 의견은 해룡신문이 기사로
        전하고, 다음 달 취재 목록이 됩니다.
      </p>

      {open.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[19px] font-bold">진행 중</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {open.map((s) => (
              <Card key={s.slug} s={s} />
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[19px] font-bold">지난 조사</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {closed.map((s) => (
              <Card key={s.slug} s={s} />
            ))}
          </div>
        </section>
      )}

      {open.length === 0 && closed.length === 0 && (
        <p className="py-16 text-center text-[18px] text-muted">
          아직 진행 중인 조사가 없습니다
        </p>
      )}
    </div>
  );
}
