import Link from "next/link";
import { AIR_GRADE } from "@/lib/localinfo";
import type { TodaySummary } from "@/lib/localinfo-data";

function Cell({
  href,
  label,
  value,
  sub,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="block min-h-[44px] w-[158px] flex-shrink-0 border-l border-line px-3 py-2.5 first:border-l-0 first:pl-0 md:w-auto"
    >
      <span className="block text-[15px] font-bold text-rose-deep">{label}</span>
      <span className="block font-display text-[20px] font-bold leading-snug">
        {value}
      </span>
      <span className="block text-[15px] leading-snug text-muted">{sub}</span>
    </Link>
  );
}

const WAIT = "잠시 뒤 확인";

// 오늘의 해룡 — 매일 첫 화면을 열 이유가 되는 숫자들. 받지 못한 값은 지어내지 않는다.
// 쓰레기 칸은 요일 표시의 뜻(배출일·수거일)을 확인하기 전까지 안내 링크만 둔다.
export default function TodayBand({ today }: { today: TodaySummary }) {
  const w = today.weather.data;
  const a = today.air.data;
  return (
    <>
    <section
      aria-label="오늘의 해룡"
      className="no-scrollbar flex overflow-x-auto border-b border-ink px-[18px] md:mx-7 md:grid md:grid-cols-5 md:overflow-visible md:px-0"
    >
      <Cell
        href="/info/weather"
        label="해룡면 날씨"
        value={w ? `${w.sky} ${w.temp}°` : WAIT}
        sub={w?.today ? `최저 ${w.today.min}° 최고 ${w.today.max}°` : "기상청 예보"}
      />
      <Cell
        href="/info/weather"
        label="미세먼지"
        value={a ? (a.checking ? "장비 점검 중" : (AIR_GRADE[a.pm10Grade ?? ""] ?? "측정 없음")) : WAIT}
        sub={a ? `초미세 ${AIR_GRADE[a.pm25Grade ?? ""] ?? "측정 없음"} · 신대 1시간` : "에어코리아"}
      />
      <Cell
        href="/info/pharmacy"
        label="영업시간 안 약국"
        value={today.openPharmacies === null ? WAIT : `해룡면 ${today.openPharmacies}곳`}
        sub="공휴일 미반영·전화 확인"
      />
      <Cell
        href="/info/emergency"
        label="응급실"
        value={today.emergencyCount === null ? WAIT : `순천 ${today.emergencyCount}곳`}
        sub="병상 현황·전화번호"
      />
      <Cell
        href="/info/recycle"
        label="쓰레기 배출"
        value="요일별 품목"
        sub="음식물·종량제 안내"
      />
    </section>
    {/* 공공누리 출처표시 조건. 값이 나가는 화면마다 밝힌다. */}
    <p className="px-[18px] pt-1 text-[14px] text-muted md:px-7 md:text-right">
      자료: 기상청 · 한국환경공단 에어코리아(실시간, 확정 전 수치) · 국립중앙의료원
    </p>
    </>
  );
}
