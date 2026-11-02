// 생활정보 판정 규칙 — 네트워크·프레임워크를 모르는 순수 함수만 둔다.
// 영업 여부와 날씨 해석은 틀리면 독자가 헛걸음을 하므로 tests/run.js 에 실제
// 응답값으로 고정한다.

const KST_MS = 9 * 60 * 60 * 1000;

// 공공데이터포털은 Encoding·Decoding 두 값을 준다. 어느 쪽을 넣어도 되게 맞춘다.
export function normalizeKey(raw: string): string {
  const key = raw.trim();
  if (!key.includes("%")) return key;
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

const ENTITY: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function cleanText(s: string): string {
  return s
    .replace(/&#x?[0-9a-fA-F]+;/g, " ")
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITY[m])
    .replace(/\s+/g, " ")
    .trim();
}

export function parseXmlItems(xml: string): Record<string, string>[] {
  return xml
    .split("<item>")
    .slice(1)
    .map((chunk) => {
      const item: Record<string, string> = {};
      for (const m of chunk.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) {
        item[m[1]] = cleanText(m[2]);
      }
      return item;
    });
}

// ── 실패 사유 ─────────────────────────────────────────────────────
export interface LiveFailure {
  reason: string; // 화면에 그대로 보여주는 한 줄
  needsAction: boolean; // 운영자가 손봐야 하는 일인가(아니면 기다리면 풀린다)
}

export function explainFailure(input: {
  status?: number;
  code?: string;
  timedOut?: boolean;
  missingKey?: boolean;
}): LiveFailure {
  if (input.missingKey) {
    return { reason: "자료 연결 설정이 아직 끝나지 않았습니다.", needsAction: true };
  }
  if (input.timedOut) {
    return { reason: "자료 제공 기관의 응답이 늦습니다. 잠시 뒤 다시 확인해 주세요.", needsAction: false };
  }
  const code = input.code ?? "";
  if (input.status === 401 || input.status === 403 || ["20", "30", "31", "32", "33"].includes(code)) {
    return { reason: "자료 사용 승인을 확인하고 있습니다.", needsAction: true };
  }
  if (input.status === 429 || code === "22") {
    return { reason: "오늘 조회 한도에 닿았습니다. 잠시 뒤 다시 확인해 주세요.", needsAction: false };
  }
  return { reason: "자료를 받지 못했습니다. 잠시 뒤 다시 확인해 주세요.", needsAction: false };
}

// ── 영업시간 ──────────────────────────────────────────────────────
// 자료의 요일 번호: 1=월 … 7=일, 8=공휴일
export const DAY_LABEL = ["", "월", "화", "수", "목", "금", "토", "일", "공휴일"];

export interface Place {
  id: string;
  name: string;
  addr: string;
  tel: string;
  kind: string;
  note: string;
  hours: ({ open: number; close: number } | null)[]; // 0번은 비워 두고 1~8을 쓴다
}

export function toPlace(item: Record<string, string>): Place {
  const hours: Place["hours"] = [null];
  for (let d = 1; d <= 8; d++) {
    const open = Number(item[`dutyTime${d}s`]);
    const close = Number(item[`dutyTime${d}c`]);
    hours.push(item[`dutyTime${d}s`] && item[`dutyTime${d}c`] ? { open, close } : null);
  }
  return {
    id: item.hpid ?? "",
    name: item.dutyName ?? "",
    addr: item.dutyAddr ?? "",
    tel: item.dutyTel1 ?? "",
    kind: item.dutyDivNam ?? "",
    note: item.dutyEtc ?? "",
    hours,
  };
}

export function isHaeryong(p: Pick<Place, "addr">): boolean {
  return p.addr.includes("해룡면");
}

// 행정구역 통합으로 순천 자료가 두 시도명에 나뉘어 있다. 합치면서 겹침을 없앤다.
export function mergePlaces(lists: Place[][]): Place[] {
  const seen = new Map<string, Place>();
  for (const p of lists.flat()) {
    if (p.id && !seen.has(p.id)) seen.set(p.id, p);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function shortAddr(addr: string): string {
  return addr.replace(/^.*?순천시\s*/, "");
}

export function kstNow(nowMs: number): { day: number; hhmm: number; ymd: string } {
  const k = new Date(nowMs + KST_MS);
  const js = k.getUTCDay();
  return {
    day: js === 0 ? 7 : js,
    hhmm: k.getUTCHours() * 100 + k.getUTCMinutes(),
    ymd: k.toISOString().slice(0, 10).replace(/-/g, ""),
  };
}

// 자료 기준으로 지금이 영업시간 안인가. 2500처럼 24시를 넘긴 값과, 닫는 시각이
// 여는 시각보다 이른 값은 다음날 새벽까지 여는 것으로 본다.
export function isOpenAt(p: Pick<Place, "hours">, nowMs: number): boolean {
  const { day, hhmm } = kstNow(nowMs);
  const today = p.hours[day];
  if (today) {
    const close = today.close <= today.open ? today.close + 2400 : today.close;
    if (hhmm >= today.open && hhmm < close) return true;
  }
  const yesterday = p.hours[day === 1 ? 7 : day - 1];
  if (yesterday) {
    const close =
      yesterday.close <= yesterday.open ? yesterday.close + 2400 : yesterday.close;
    if (close > 2400 && hhmm < close - 2400) return true;
  }
  return false;
}

export function clock(t: number): string {
  const next = t >= 2400;
  const v = next ? t - 2400 : t;
  const text = `${String(Math.floor(v / 100)).padStart(2, "0")}:${String(v % 100).padStart(2, "0")}`;
  return next && v > 0 ? `다음날 ${text}` : next ? "24:00" : text;
}

export function hoursLabel(p: Pick<Place, "hours">, day: number): string {
  const h = p.hours[day];
  return h ? `${clock(h.open)} ~ ${clock(h.close)}` : "등록된 시간 없음";
}

// ── 응급실 ────────────────────────────────────────────────────────
// hvec 는 응급실 가용 병상 수이고, 0 이하이면 자리가 없다는 뜻이다(음수는 초과 수용).
export function bedLabel(hvec: string | undefined): string {
  const n = Number(hvec);
  if (hvec === undefined || hvec === "" || Number.isNaN(n)) return "병상 정보 없음";
  return n > 0 ? `일반 병상 ${n}석` : "일반 병상 여유 없음";
}

// "20261102144832" → "11월 2일 14:48"
export function stampLabel(stamp: string | undefined): string {
  if (!stamp || stamp.length < 12) return "";
  const m = Number(stamp.slice(4, 6));
  const d = Number(stamp.slice(6, 8));
  return `${m}월 ${d}일 ${stamp.slice(8, 10)}:${stamp.slice(10, 12)}`;
}

// ── 날씨 ──────────────────────────────────────────────────────────
const SKY: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const RAIN: Record<string, string> = {
  "1": "비",
  "2": "비·눈",
  "3": "눈",
  "4": "소나기",
  "5": "빗방울",
  "6": "빗방울·눈날림",
  "7": "눈날림",
};
export const AIR_GRADE: Record<string, string> = {
  "1": "좋음",
  "2": "보통",
  "3": "나쁨",
  "4": "매우나쁨",
};

export function skyLabel(sky?: string, pty?: string): string {
  if (pty && pty !== "0" && RAIN[pty]) return RAIN[pty];
  return (sky && SKY[sky]) || "정보 없음";
}

function shiftYmd(nowMs: number, hours: number): { ymd: string; hour: number } {
  const k = new Date(nowMs + KST_MS + hours * 3600 * 1000);
  return {
    ymd: k.toISOString().slice(0, 10).replace(/-/g, ""),
    hour: k.getUTCHours(),
  };
}

// 초단기실황은 매시 40분 무렵에 나온다.
export function ncstBase(nowMs: number): { date: string; time: string } {
  const minute = new Date(nowMs + KST_MS).getUTCMinutes();
  const s = shiftYmd(nowMs, minute < 45 ? -1 : 0);
  return { date: s.ymd, time: `${String(s.hour).padStart(2, "0")}00` };
}

// 단기예보는 02시부터 3시간마다 나오고 약 10분 뒤에 제공된다.
export function fcstBase(nowMs: number): { date: string; time: string } {
  const s = shiftYmd(nowMs, -0.25);
  const issue = [23, 20, 17, 14, 11, 8, 5, 2].find((h) => h <= s.hour);
  if (issue === undefined) {
    return { date: shiftYmd(nowMs, -24).ymd, time: "2300" };
  }
  return { date: s.ymd, time: `${String(issue).padStart(2, "0")}00` };
}

// 최고·최저는 02시 예보에만 그날치가 온전히 담긴다.
export function dayRangeBase(nowMs: number): { date: string; time: string } {
  const { hhmm } = kstNow(nowMs);
  if (hhmm >= 215) return { date: kstNow(nowMs).ymd, time: "0200" };
  return { date: shiftYmd(nowMs, -24).ymd, time: "2300" };
}

export interface FcstItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

export interface HourForecast {
  label: string;
  temp: string;
  sky: string;
  pop: string;
}

export function nextHours(items: FcstItem[], nowMs: number, count = 8): HourForecast[] {
  const { ymd, hhmm } = kstNow(nowMs);
  const nowKey = `${ymd}${String(Math.floor(hhmm / 100) * 100).padStart(4, "0")}`;
  const slots = new Map<string, Record<string, string>>();
  for (const it of items) {
    const key = `${it.fcstDate}${it.fcstTime}`;
    if (key < nowKey) continue;
    slots.set(key, { ...(slots.get(key) ?? {}), [it.category]: it.fcstValue });
  }
  return [...slots.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([key, v]) => ({
      label: `${Number(key.slice(8, 10))}시`,
      temp: v.TMP ?? "-",
      sky: skyLabel(v.SKY, v.PTY),
      pop: v.POP ?? "-",
    }));
}

export interface DayForecast {
  ymd: string;
  min: string;
  max: string;
  sky: string;
}

export function dayForecasts(items: FcstItem[]): DayForecast[] {
  const days = new Map<string, DayForecast & { noon?: Record<string, string> }>();
  for (const it of items) {
    const d = days.get(it.fcstDate) ?? {
      ymd: it.fcstDate,
      min: "-",
      max: "-",
      sky: "정보 없음",
    };
    if (it.category === "TMN") d.min = String(Math.round(Number(it.fcstValue)));
    if (it.category === "TMX") d.max = String(Math.round(Number(it.fcstValue)));
    if (it.fcstTime === "1200" && (it.category === "SKY" || it.category === "PTY")) {
      d.noon = { ...(d.noon ?? {}), [it.category]: it.fcstValue };
    }
    days.set(it.fcstDate, d);
  }
  return [...days.values()]
    .sort((a, b) => a.ymd.localeCompare(b.ymd))
    .map(({ noon, ...d }) => ({ ...d, sky: skyLabel(noon?.SKY, noon?.PTY) }));
}
