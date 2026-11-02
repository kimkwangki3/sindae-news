import Link from "next/link";
import {
  FaqBlock,
  INFO_H2,
  LiveFail,
  PlaceRow,
  SourceNote,
} from "@/components/info/LiveParts";
import { getClinics } from "@/lib/localinfo-data";
import { clock, DAY_LABEL, isHaeryong, isOpenAt, kstNow } from "@/lib/localinfo";

export const metadata = {
  title: "해룡면 병원·의원 — 진료시간과 전화번호 · 해룡신문",
  description:
    "순천시 해룡면 병원, 의원, 치과, 한의원의 요일별 진료시간과 전화번호를 종별로 모았습니다.",
  alternates: { canonical: "/info/hospital" },
};

export const dynamic = "force-dynamic";

// 자료의 종별 이름 그대로 묶는다. 앞에 적은 순서로 보여주고 나머지는 뒤에 붙인다.
const ORDER = ["의원", "병원", "치과의원", "한의원", "보건소"];

export default async function HospitalPage() {
  const { data, fail } = await getClinics();
  const now = Date.now();
  const { day, hhmm } = kstNow(now);
  const haeryong = (data ?? []).filter(isHaeryong);

  const kinds = [...new Set(haeryong.map((p) => p.kind))].sort((a, b) => {
    const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
    return rank(a) - rank(b);
  });
  const openCount = haeryong.filter((p) => isOpenAt(p, now)).length;

  const faq = [
    {
      q: "해룡면에 병원과 의원은 몇 곳 있나요?",
      a: `국립중앙의료원 자료 기준 해룡면 주소로 등록된 의료기관은 ${haeryong.length}곳입니다.`,
    },
    {
      q: "밤이나 휴일에 갑자기 아프면 어디로 가야 하나요?",
      a: "위급하면 119에 전화하세요. 순천시 응급실 위치와 전화번호는 응급실 안내에 모아 두었습니다.",
    },
  ];

  return (
    <div className="px-[18px] py-6 md:px-7">
      <Link href="/info" className="text-[17px] text-muted">
        ‹ 생활정보
      </Link>
      <h1 className="mt-2 text-2xl leading-snug text-rose-deep">
        해룡면 병원·의원 진료시간
      </h1>
      <p className="mt-2 text-[18px] leading-relaxed text-muted">
        {DAY_LABEL[day]}요일 {clock(hhmm)} 기준 진료시간 안에 있는 곳은{" "}
        {openCount}곳입니다. 점심시간과 임시 휴진은 반영되지 않으니 가기 전에
        전화로 확인해 주세요.
      </p>
      <Link
        href="/info/emergency"
        className="mt-3 flex min-h-[48px] items-center justify-center rounded-element bg-rose-deep text-[18px] text-white"
      >
        응급실 안내 보기
      </Link>

      {fail ? (
        <LiveFail fail={fail} />
      ) : (
        <>
          {kinds.map((kind) => {
            const list = haeryong.filter((p) => p.kind === kind);
            return (
              <section key={kind}>
                <h2 className={INFO_H2}>
                  {kind || "기타"} ({list.length}곳)
                </h2>
                <ul className="mt-2">
                  {list.map((p) => (
                    <PlaceRow
                      key={p.id}
                      place={p}
                      day={day}
                      open={isOpenAt(p, now)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          <FaqBlock items={faq} />
        </>
      )}

      <SourceNote>
        <p>
          자료: 국립중앙의료원 전국 병·의원 찾기 서비스(공공데이터포털). 이름순이며
          추천이나 순위가 아닙니다. 기관이 제공한 자료라 실제와 다를 수 있습니다.
        </p>
      </SourceNote>
    </div>
  );
}
