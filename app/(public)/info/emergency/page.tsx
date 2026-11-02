import Link from "next/link";
import {
  CallButton,
  FaqBlock,
  INFO_H2,
  LiveFail,
  SourceNote,
} from "@/components/info/LiveParts";
import { getEmergencyRooms } from "@/lib/localinfo-data";
import { bedLabel, shortAddr } from "@/lib/localinfo";

export const metadata = {
  title: "순천 응급실 — 위치·전화번호·병상 현황 · 해룡신문",
  description:
    "순천시 응급의료기관의 위치, 전화번호, 응급실 병상 현황을 확인합니다. 위급하면 119에 먼저 전화하세요.",
  alternates: { canonical: "/info/emergency" },
};

export const dynamic = "force-dynamic";

export default async function EmergencyPage() {
  const { data, fail } = await getEmergencyRooms();
  const now = Date.now();

  const faq = [
    {
      q: "순천에 응급실은 몇 곳 있나요?",
      a: `국립중앙의료원 자료 기준 순천시 응급의료기관은 ${data?.length ?? 0}곳입니다.`,
    },
    {
      q: "응급실에 바로 가도 되나요?",
      a: "위급하면 바로 119에 전화하세요. 직접 이동할 수 있는 상태라면 응급실에 전화해 진료 가능 여부를 확인할 수 있습니다.",
    },
  ];

  return (
    <div className="px-[18px] py-6 md:px-7">
      <Link href="/info" className="text-[17px] text-muted">
        ‹ 생활정보
      </Link>
      <h1 className="mt-2 text-2xl leading-snug text-rose-deep">
        순천 응급실 안내
      </h1>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-card bg-ink p-4 text-white">
        <p>
          <b className="block font-serif text-[24px]">위급하면 119</b>
          <span className="text-[17px]">이 페이지보다 전화가 먼저입니다.</span>
        </p>
        <a
          href="tel:119"
          className="flex min-h-[48px] flex-shrink-0 items-center rounded-element bg-white px-4 text-[18px] font-bold text-ink"
        >
          119 전화
        </a>
      </div>

      {fail ? (
        <LiveFail fail={fail} />
      ) : (
        <>
          <h2 className={INFO_H2}>응급의료기관 ({data.length}곳)</h2>
          <p className="mt-1 text-[16px] text-muted">
            이름순입니다. 병상 수는 병원이 입력한 참고 정보로 수시로 바뀝니다. 수용이나
            진료 가능 여부를 보장하지 않으며, 의료 판단을 대신하지 않습니다. 병상이
            있어도 전문의 부재 등으로 진료가 어려울 수 있습니다.
          </p>
          <ul className="mt-2">
            {data.map((er) => (
              <li
                key={er.id}
                className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[19px] font-bold leading-snug">{er.name}</p>
                  <p className="text-[16px] leading-snug text-muted">
                    {er.grade} · {shortAddr(er.addr)}
                  </p>
                  <p className="text-[17px] leading-snug text-ink">
                    {bedLabel(er.hvec, er.stamp, now)}
                    {er.updated && (
                      <span className="text-muted"> · {er.updated} 기준</span>
                    )}
                  </p>
                </div>
                <CallButton tel={er.tel} />
              </li>
            ))}
          </ul>
          <FaqBlock items={faq} />
        </>
      )}

      <SourceNote>
        <p>
          자료: 국립중앙의료원 전국 응급의료기관 정보(공공데이터포털). 병상 수는 각
          병원이 입력한 값이며, 표시된 시각 이후 달라졌을 수 있습니다.
        </p>
      </SourceNote>
    </div>
  );
}
