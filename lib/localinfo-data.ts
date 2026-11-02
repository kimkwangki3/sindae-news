// 공공데이터 조회. 판정은 lib/localinfo.ts 의 순수 함수가 맡고, 여기서는 받아오기만 한다.
//
// fetch 캐시 대신 unstable_cache를 쓴다. 조회 한도 초과 같은 오류도 HTTP 200으로
// 오기 때문에 fetch 캐시에 맡기면 오류 응답이 몇 시간씩 굳는다. 안에서 throw 하면
// 그 결과는 저장되지 않는다.

import { unstable_cache } from "next/cache";
import {
  bedLabel,
  dayForecasts,
  dayRangeBase,
  explainFailure,
  fcstBase,
  isHaeryong,
  isOpenAt,
  kstNow,
  mergePlaces,
  ncstBase,
  nextHours,
  normalizeKey,
  parseXmlItems,
  stampLabel,
  toPlace,
  type DayForecast,
  type FcstItem,
  type HourForecast,
  type LiveFailure,
  type Place,
} from "@/lib/localinfo";

const NMC = "https://apis.data.go.kr/B552657";
// 통합특별시 출범 뒤 기관별로 옮겨 가는 중이라 두 이름을 모두 조회한다.
const SIDO = ["전라남도", "전남광주통합특별시"];
const CITY = "순천시";
// 기상청 격자(해룡면 신대지구 위경도 34.93, 127.53)와 에어코리아 측정소.
const GRID = { nx: "70", ny: "70" };
const AIR_STATION = "신대";
const TIMEOUT_MS = 12000;

export type Live<T> = { data: T; fail: null } | { data: null; fail: LiveFailure };

class FetchFailure extends Error {
  constructor(public detail: Parameters<typeof explainFailure>[0]) {
    super("공공데이터 조회 실패");
  }
}

async function call(url: string, params: Record<string, string>): Promise<string> {
  const raw = process.env.DATA_GO_KR_KEY;
  if (!raw) throw new FetchFailure({ missingKey: true });
  const query = new URLSearchParams({ serviceKey: normalizeKey(raw), ...params });
  let res: Response;
  try {
    res = await fetch(`${url}?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new FetchFailure({ timedOut: true });
  }
  const text = await res.text();
  const code = text.match(/resultCode"?\s*[:>]\s*"?(\d+)/)?.[1];
  const reason = text.match(/returnReasonCode>(\d+)/)?.[1];
  if (!res.ok || (code && code !== "00") || reason) {
    throw new FetchFailure({ status: res.status, code: code ?? reason });
  }
  return text;
}

async function live<T>(label: string, read: () => Promise<T>): Promise<Live<T>> {
  try {
    return { data: await read(), fail: null };
  } catch (err) {
    const fail = explainFailure(err instanceof FetchFailure ? err.detail : {});
    // 사유만 남긴다. 주소에는 인증키가 들어 있어 로그에 적지 않는다.
    // eslint-disable-next-line no-console
    console.warn(`[localinfo] ${label} 실패: ${fail.reason}`);
    return { data: null, fail };
  }
}

async function readPlaces(url: string): Promise<Place[]> {
  const lists = await Promise.all(
    SIDO.map(async (sido) =>
      parseXmlItems(
        await call(url, { Q0: sido, Q1: CITY, pageNo: "1", numOfRows: "1000" }),
      ).map(toPlace),
    ),
  );
  return mergePlaces(lists);
}

const DAY = 60 * 60 * 24;

const cachedPharmacies = unstable_cache(
  () => readPlaces(`${NMC}/ErmctInsttInfoInqireService/getParmacyListInfoInqire`),
  ["suncheon-pharmacies"],
  { revalidate: DAY },
);
const cachedClinics = unstable_cache(
  () => readPlaces(`${NMC}/HsptlAsembySearchService/getHsptlMdcncListInfoInqire`),
  ["suncheon-clinics"],
  { revalidate: DAY },
);

export const getPharmacies = () => live("약국", cachedPharmacies);
export const getClinics = () => live("병의원", cachedClinics);

export interface EmergencyRoom {
  id: string;
  name: string;
  grade: string;
  addr: string;
  tel: string;
  beds: string;
  updated: string;
}

const cachedEmergency = unstable_cache(
  async (): Promise<EmergencyRoom[]> => {
    const url = `${NMC}/ErmctInfoInqireService`;
    const [lists, beds] = await Promise.all([
      Promise.all(
        SIDO.map(async (s) =>
          parseXmlItems(
            await call(`${url}/getEgytListInfoInqire`, {
              Q0: s,
              Q1: CITY,
              pageNo: "1",
              numOfRows: "30",
            }),
          ),
        ),
      ),
      Promise.all(
        SIDO.map(async (s) =>
          parseXmlItems(
            await call(`${url}/getEmrrmRltmUsefulSckbdInfoInqire`, {
              STAGE1: s,
              STAGE2: CITY,
              pageNo: "1",
              numOfRows: "30",
            }),
          ),
        ),
      ),
    ]);
    const bedById = new Map(beds.flat().map((b) => [b.hpid, b]));
    return lists
      .flat()
      .map((e) => {
        const b = bedById.get(e.hpid);
        return {
          id: e.hpid,
          name: e.dutyName ?? "",
          grade: e.dutyEmclsName ?? "",
          addr: e.dutyAddr ?? "",
          tel: e.dutyTel3 || e.dutyTel1 || "",
          beds: bedLabel(b?.hvec),
          updated: stampLabel(b?.hvidate),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  },
  ["suncheon-emergency"],
  { revalidate: 300 },
);
export const getEmergencyRooms = () => live("응급실", cachedEmergency);

export interface WeatherNow {
  temp: string;
  humidity: string;
  wind: string;
  rainNow: string;
  baseLabel: string;
  sky: string;
  today: DayForecast | null;
  days: DayForecast[];
  hours: HourForecast[];
}

async function fcstItems(base: { date: string; time: string }): Promise<FcstItem[]> {
  const text = await call(
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
    {
      ...GRID,
      base_date: base.date,
      base_time: base.time,
      dataType: "JSON",
      pageNo: "1",
      numOfRows: "1000",
    },
  );
  return (JSON.parse(text).response?.body?.items?.item ?? []) as FcstItem[];
}

// 시각 조각을 캐시 키로 삼아 발표 시각이 바뀌면 새로 받는다.
const cachedWeather = unstable_cache(
  async (nowMs: number): Promise<WeatherNow> => {
    const base = ncstBase(nowMs);
    const text = await call(
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst",
      {
        ...GRID,
        base_date: base.date,
        base_time: base.time,
        dataType: "JSON",
        pageNo: "1",
        numOfRows: "10",
      },
    );
    const obs = (JSON.parse(text).response?.body?.items?.item ?? []) as {
      category: string;
      obsrValue: string;
    }[];
    const value = (c: string) => obs.find((o) => o.category === c)?.obsrValue ?? "-";

    const [recent, range] = await Promise.all([
      fcstItems(fcstBase(nowMs)),
      fcstItems(dayRangeBase(nowMs)),
    ]);
    const days = dayForecasts(range);
    const hours = nextHours(recent, nowMs);
    const { ymd } = kstNow(nowMs);
    return {
      temp: value("T1H"),
      humidity: value("REH"),
      wind: value("WSD"),
      rainNow: value("RN1"),
      baseLabel: `${Number(base.time.slice(0, 2))}시 관측`,
      sky: hours[0]?.sky ?? "정보 없음",
      today: days.find((d) => d.ymd === ymd) ?? null,
      days: days.filter((d) => d.ymd >= ymd).slice(0, 3),
      hours,
    };
  },
  ["haeryong-weather"],
  { revalidate: 1800 },
);

// 인자가 키에 들어가므로 30분 단위로 내려 맞춘다.
export const getWeather = () => {
  const slot = Math.floor(Date.now() / (30 * 60 * 1000)) * 30 * 60 * 1000;
  return live("날씨", () => cachedWeather(slot));
};

export interface AirNow {
  station: string;
  pm10: string;
  pm10Grade: string | null;
  pm25: string;
  pm25Grade: string | null;
  dataTime: string;
}

const cachedAir = unstable_cache(
  async (): Promise<AirNow> => {
    const text = await call(
      "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty",
      {
        stationName: AIR_STATION,
        dataTerm: "DAILY",
        returnType: "json",
        numOfRows: "1",
        pageNo: "1",
        ver: "1.0",
      },
    );
    const row = JSON.parse(text).response?.body?.items?.[0];
    if (!row) throw new FetchFailure({});
    return {
      station: AIR_STATION,
      pm10: row.pm10Value ?? "-",
      pm10Grade: row.pm10Grade ?? null,
      pm25: row.pm25Value ?? "-",
      pm25Grade: row.pm25Grade ?? null,
      dataTime: row.dataTime ?? "",
    };
  },
  ["haeryong-air"],
  { revalidate: 1800 },
);
export const getAir = () => live("미세먼지", cachedAir);

export interface TodaySummary {
  weather: Live<WeatherNow>;
  air: Live<AirNow>;
  openPharmacies: number | null;
  emergencyCount: number | null;
}

// 첫 화면 '오늘의 해룡' 띠.
export async function getTodaySummary(): Promise<TodaySummary> {
  const [weather, air, pharmacies, emergency] = await Promise.all([
    getWeather(),
    getAir(),
    getPharmacies(),
    getEmergencyRooms(),
  ]);
  const now = Date.now();
  return {
    weather,
    air,
    openPharmacies: pharmacies.data
      ? pharmacies.data.filter((p) => isHaeryong(p) && isOpenAt(p, now)).length
      : null,
    emergencyCount: emergency.data ? emergency.data.length : null,
  };
}
