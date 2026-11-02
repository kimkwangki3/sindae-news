import Link from "next/link";
import {
  FaqBlock,
  INFO_H2,
  LiveFail,
  SourceNote,
} from "@/components/info/LiveParts";
import { getAir, getWeather } from "@/lib/localinfo-data";
import { AIR_GRADE } from "@/lib/localinfo";

export const metadata = {
  title: "해룡면 날씨 — 오늘 예보와 신대 미세먼지 · 해룡신문",
  description:
    "순천시 해룡면 현재 기온과 시간별·3일 예보, 신대 측정소 미세먼지를 확인합니다.",
  alternates: { canonical: "/info/weather" },
};

export const dynamic = "force-dynamic";

const dayName = (ymd: string) =>
  `${Number(ymd.slice(4, 6))}월 ${Number(ymd.slice(6, 8))}일`;

export default async function WeatherPage() {
  const [weather, air] = await Promise.all([getWeather(), getAir()]);
  const w = weather.data;
  const a = air.data;

  const faq = [
    {
      q: "오늘 해룡면 날씨는 어떤가요?",
      a: w
        ? `${w.baseLabel} 기온은 ${w.temp}도입니다. 하늘 상태는 예보 기준 ${w.sky}입니다.`
        : "지금은 자료를 받지 못했습니다. 잠시 뒤 다시 확인해 주세요.",
    },
    {
      q: "해룡면 미세먼지는 어디 측정값인가요?",
      a: "에어코리아 신대 측정소의 실시간 값입니다. 해룡면 전체를 대표하는 값은 아니며, 확정값과 달라질 수 있습니다.",
    },
  ];

  return (
    <div className="px-[18px] py-6 md:px-7">
      <Link href="/info" className="text-[17px] text-muted">
        ‹ 생활정보
      </Link>
      <h1 className="mt-2 text-2xl leading-snug text-rose-deep">해룡면 날씨</h1>

      {weather.fail ? (
        <LiveFail fail={weather.fail} />
      ) : (
        <>
          <div className="mt-4 rounded-card border border-line bg-white p-5">
            <p className="text-[17px] text-muted">{w?.baseLabel}</p>
            <p className="mt-1 font-display text-[44px] font-black leading-none">
              {w?.temp}°
            </p>
            <p className="mt-2 text-[19px]">
              예보 {w?.sky}
              {w?.today && ` · 최저 ${w.today.min}° 최고 ${w.today.max}°`}
            </p>
            <p className="mt-1 text-[17px] text-muted">
              습도 {w?.humidity}% · 바람 {w?.wind}m/s · 1시간 강수량{" "}
              {w?.rainNow}mm
            </p>
          </div>

          <h2 className={INFO_H2}>시간별 예보</h2>
          <ul className="no-scrollbar mt-2 flex gap-4 overflow-x-auto pb-1">
            {w?.hours.map((h) => (
              <li key={h.label} className="flex-shrink-0 text-center">
                <p className="text-[16px] text-muted">{h.label}</p>
                <p className="text-[20px] font-bold">{h.temp}°</p>
                <p className="text-[16px]">{h.sky}</p>
                <p className="text-[15px] text-muted">강수 {h.pop}%</p>
              </li>
            ))}
          </ul>

          <h2 className={INFO_H2}>3일 예보</h2>
          <ul className="mt-2">
            {w?.days.map((d) => (
              <li
                key={d.ymd}
                className="grid min-h-[44px] grid-cols-3 items-center gap-3 border-t border-line text-[18px] first:border-t-0"
              >
                <span>{dayName(d.ymd)}</span>
                <span className="text-center">{d.sky}</span>
                <span className="text-right">
                  {d.min}° / {d.max}°
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={INFO_H2}>미세먼지 (신대 측정소)</h2>
      {air.fail ? (
        <LiveFail fail={air.fail} />
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-[16px] text-muted">미세먼지</p>
            <p className="text-[22px] font-bold">
              {a?.checking ? "장비 점검 중" : (AIR_GRADE[a?.pm10Grade ?? ""] ?? "측정 없음")}
            </p>
            <p className="text-[16px] text-muted">{a?.pm10} ㎍/㎥</p>
          </div>
          <div className="rounded-card border border-line bg-white p-4">
            <p className="text-[16px] text-muted">초미세먼지</p>
            <p className="text-[22px] font-bold">
              {a?.checking ? "장비 점검 중" : (AIR_GRADE[a?.pm25Grade ?? ""] ?? "측정 없음")}
            </p>
            <p className="text-[16px] text-muted">{a?.pm25} ㎍/㎥</p>
          </div>
          <p className="col-span-2 text-[16px] text-muted">
            {a?.dataTime} 기준 · 1시간 등급
          </p>
        </div>
      )}

      <FaqBlock items={faq} />

      <SourceNote>
        <p>
          자료: 기상청 단기예보 조회서비스(공공누리 제1유형), 한국환경공단
          에어코리아 대기오염정보(공공누리 제3유형,{" "}
          <a
            href="https://www.airkorea.or.kr"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline"
          >
            airkorea.or.kr
          </a>
          ). 에어코리아 값은 실시간 측정 자료로 확정 전 수치이며, 측정기 상태에 따라
          달라질 수 있습니다.
        </p>
      </SourceNote>
    </div>
  );
}
