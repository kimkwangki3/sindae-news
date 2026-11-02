import Link from "next/link";
import {
  FaqBlock,
  INFO_H2,
  LiveFail,
  PlaceRow,
  SourceNote,
} from "@/components/info/LiveParts";
import { getPharmacies } from "@/lib/localinfo-data";
import { clock, isHaeryong, isOpenAt, kstNow, DAY_LABEL } from "@/lib/localinfo";

export const metadata = {
  title: "해룡면 약국 영업시간 — 지금 영업시간 안인 곳 · 해룡신문",
  description:
    "순천시 해룡면 약국의 요일별 영업시간과 지금 영업시간 안에 있는 약국을 한곳에서 확인합니다. 신대·복성·선월지구 약국 전화번호 포함.",
  alternates: { canonical: "/info/pharmacy" },
};

// 현재 시각으로 판정하므로 요청마다 그린다. 자료 자체는 하루 동안 보관한다.
export const dynamic = "force-dynamic";

export default async function PharmacyPage() {
  const { data, fail } = await getPharmacies();
  const now = Date.now();
  const { day, hhmm } = kstNow(now);

  const haeryong = (data ?? []).filter(isHaeryong);
  const openHere = haeryong.filter((p) => isOpenAt(p, now));
  const openCity = (data ?? []).filter(
    (p) => !isHaeryong(p) && isOpenAt(p, now),
  );
  const sundayCount = haeryong.filter((p) => p.hours[7]).length;
  const holidayCount = haeryong.filter((p) => p.hours[8]).length;

  const faq = [
    {
      q: "해룡면에 약국이 몇 곳 있나요?",
      a: `국립중앙의료원 자료 기준 해룡면 주소로 등록된 약국은 ${haeryong.length}곳입니다.`,
    },
    {
      q: "해룡면에 일요일에 여는 약국이 있나요?",
      a: `일요일 영업시간이 등록된 해룡면 약국은 ${sundayCount}곳입니다. 격주 휴무 등 예외가 있을 수 있어 가기 전에 전화로 확인해 주세요.`,
    },
    {
      q: "공휴일에 여는 약국은 어떻게 찾나요?",
      a: `공휴일 영업시간이 등록된 해룡면 약국은 ${holidayCount}곳입니다. 이 페이지는 공휴일을 따로 판별하지 않고 요일 기준으로 표시하므로, 공휴일에는 약국에 전화로 확인해 주세요.`,
    },
  ];

  return (
    <div className="px-[18px] py-6 md:px-7">
      <Link href="/info" className="text-[17px] text-muted">
        ‹ 생활정보
      </Link>
      <h1 className="mt-2 text-2xl leading-snug text-rose-deep">
        해룡면 약국 — 지금 영업시간 안인 곳
      </h1>
      <p className="mt-2 text-[18px] leading-relaxed text-muted">
        {DAY_LABEL[day]}요일 {clock(hhmm)} 기준으로 등록된 영업시간에서 찾은
        결과입니다. 공휴일·임시 휴무는 반영되지 않으니 가기 전에 전화로 확인해
        주세요.
      </p>

      {fail ? (
        <LiveFail fail={fail} />
      ) : (
        <>
          <h2 className={INFO_H2}>지금 영업시간 안 ({openHere.length}곳)</h2>
          {openHere.length > 0 ? (
            <ul className="mt-2">
              {openHere.map((p) => (
                <PlaceRow key={p.id} place={p} day={day} open />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[18px] leading-relaxed">
              지금 영업시간 안에 있는 해룡면 약국이 없습니다.
            </p>
          )}

          {openHere.length === 0 && openCity.length > 0 && (
            <>
              <h2 className={INFO_H2}>순천시 다른 곳 ({openCity.length}곳)</h2>
              <ul className="mt-2">
                {openCity.map((p) => (
                  <PlaceRow key={p.id} place={p} day={day} open />
                ))}
              </ul>
            </>
          )}

          <h2 className={INFO_H2}>해룡면 약국 전체 ({haeryong.length}곳)</h2>
          <p className="mt-1 text-[16px] text-muted">이름순이며 순위가 아닙니다.</p>
          <ul className="mt-2">
            {haeryong.map((p) => (
              <PlaceRow
                key={p.id}
                place={p}
                day={day}
                open={isOpenAt(p, now)}
              />
            ))}
          </ul>
          <FaqBlock items={faq} />
        </>
      )}

      <SourceNote>
        <p>
          자료: 국립중앙의료원 전국 약국 정보(공공데이터포털). 약국이 제공한
          자료라 실제 영업시간과 다를 수 있습니다.
        </p>
      </SourceNote>
    </div>
  );
}
