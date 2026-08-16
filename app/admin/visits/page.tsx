import Link from "next/link";
import RankBars from "@/components/admin/RankBars";
import TrendChart from "@/components/admin/TrendChart";
import { PageHead } from "@/components/admin/ui";
import { getVisitStats } from "@/lib/mock/admin";
import {
  getVisitAnalytics,
  PERIODS,
  PERIOD_LABEL,
  toPeriod,
} from "@/lib/mock/admin-visits";

export const metadata = { title: "접속 분석 · 관리자" };
export const dynamic = "force-dynamic";

// 경로를 사람이 읽는 이름으로. 기사·업체 상세는 주소가 다 달라서 그대로 두면
// 목록이 id 문자열로 뒤덮인다.
function pathLabel(p: string): string {
  if (p === "/") return "홈";
  const named: Record<string, string> = {
    "/articles": "기사 목록",
    "/board": "자유게시판",
    "/district": "해룡상권",
    "/orgs": "지역단체",
    "/surveys": "의견수렴",
    "/tips": "기사제보",
    "/recruit": "기자모집",
    "/search": "검색",
    "/me": "내정보",
  };
  return named[p] ?? p;
}

function Tile({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 rounded-card border border-line bg-white p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold text-rose-deep">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-bold text-muted">{unit}</span>
        )}
      </p>
      {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
    </div>
  );
}

export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  const days = toPeriod(searchParams.d);

  // 일별 추세는 기존 함수를 그대로 쓴다(대시보드와 같은 집계라 숫자가
  // 어긋나지 않는다). 나머지는 이 화면 전용 집계다.
  const [trend, a] = await Promise.all([
    getVisitStats(days),
    getVisitAnalytics(days),
  ]);

  // 바깥에서 들어온 것과 사이트 안 이동을 가른다.
  const external = a.sources.filter((s) => !s.isInternal);
  const internal = a.sources.filter((s) => s.isInternal);

  const perVisitor =
    a.summary.visitors > 0 ? a.summary.views / a.summary.visitors : 0;
  const dailyAvg =
    a.summary.daysWithTraffic > 0
      ? Math.round(a.summary.views / a.summary.daysWithTraffic)
      : 0;

  return (
    <div className="px-[18px] py-5">
      <PageHead
        title="접속 분석"
        sub="한국시간 기준 · 방문자는 브라우저(쿠키) 단위로 셉니다"
        action={
          <Link href="/admin" className="text-xs text-muted">
            ‹ 대시보드
          </Link>
        }
      />

      {/* 기간 — 링크로 바꾼다. 자바스크립트 없이 되고, 주소를 그대로
          북마크하거나 남에게 보낼 수 있다. */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/visits?d=${p}`}
            className={`min-h-[36px] rounded-full border px-3 text-sm leading-[34px] ${
              p === days
                ? "border-rose bg-rose text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {PERIOD_LABEL[p]}
          </Link>
        ))}
      </div>

      {!a.available ? (
        <p className="rounded-card border border-line bg-white p-6 text-center text-sm leading-relaxed text-muted">
          집계 준비가 아직 끝나지 않았습니다.
          <br />
          <code className="text-[15px]">db/visit-analytics-migration.sql</code>{" "}
          을 실행해 주세요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Tile
              label="방문자"
              value={a.summary.visitors.toLocaleString()}
              unit="명"
              sub={`${PERIOD_LABEL[days]} 합계`}
            />
            <Tile
              label="페이지뷰"
              value={a.summary.views.toLocaleString()}
              unit="회"
              sub={`하루 평균 ${dailyAvg.toLocaleString()}회`}
            />
          </div>
          <div className="flex gap-2">
            <Tile
              label="1인당 페이지뷰"
              value={perVisitor.toFixed(1)}
              unit="쪽"
              sub="한 사람이 본 쪽 수"
            />
            <Tile
              label="접속이 있던 날"
              value={a.summary.daysWithTraffic.toLocaleString()}
              unit="일"
              sub={`${days}일 중`}
            />
          </div>

          {/* 기간 합계 방문자는 일별 방문자를 더한 값이 아니다. 사흘 연속
              들른 한 사람은 여기서 1명, 일별 그래프에서는 3번 세어진다.
              둘 다 맞는 숫자인데 뜻이 달라, 그 차이를 적어 둔다. */}
          <p className="text-[15px] leading-relaxed text-muted">
            ※ 위 방문자 수는 기간 전체에서 <b>겹치지 않게</b> 센 값입니다. 아래
            일별 그래프의 방문자를 모두 더한 값보다 작은 것이 정상입니다 —
            며칠에 걸쳐 다시 온 분을 한 번만 세기 때문입니다.
          </p>

          <TrendChart days={trend.days} />

          <RankBars
            title="많이 본 쪽"
            unit="회"
            items={a.paths.map((p) => ({
              key: p.path,
              // 기사면 제목을, 그 밖의 화면이면 우리말 이름을 앞에 둔다.
              // 주소는 뒤에 작게 붙여 어느 쪽인지 확인할 수 있게 한다.
              label: (
                <>
                  {p.title ?? pathLabel(p.path)}
                  {(p.title || pathLabel(p.path) !== p.path) && (
                    <span className="ml-1.5 text-[15px] text-muted">
                      {p.path}
                    </span>
                  )}
                </>
              ),
              value: p.views,
              sub: `방문자 ${p.visitors.toLocaleString()}명`,
            }))}
          />

          {/* 유입에서 '사이트 안에서 이동'은 빼고 센다. 우리 사이트 안에서
              링크를 타고 넘어가도 referrer 에는 우리 주소가 남는데, 그것까지
              함께 줄 세우면 늘 1위를 차지해 정작 궁금한 카카오톡·검색이
              그 아래 묻힌다. 뺀 사실은 아래에 밝혀 둔다. */}
          <RankBars
            title="어디서 들어왔나"
            unit="회"
            items={external.map((s) => ({
              key: s.source,
              label: s.source,
              value: s.views,
              sub: `방문자 ${s.visitors.toLocaleString()}명`,
            }))}
            empty="바깥에서 들어온 기록이 아직 없습니다"
          />
          {internal.length > 0 && (
            <p className="-mt-1 text-[15px] leading-relaxed text-muted">
              ※ 사이트 안에서 링크를 타고 넘어간{" "}
              {internal
                .reduce((sum, s) => sum + s.views, 0)
                .toLocaleString()}
              회는 위 목록에서 제외했습니다. 밖에서 들어온 것이 아니라 우리
              사이트를 둘러본 기록입니다.
            </p>
          )}

          <RankBars
            title="시간대별 (한국시간)"
            unit="회"
            items={a.hours.map((h) => ({
              key: String(h.hour),
              label: `${String(h.hour).padStart(2, "0")}시`,
              value: h.views,
            }))}
          />

          {/* 기사별 — 이 화면의 알맹이. 조회수만 보면 제목만 보고 닫은 기사와
              끝까지 읽힌 기사가 같아 보인다. 지역 신문에는 그 차이가 더 중요해서
              체류시간과 읽음률을 함께 낸다. */}
          <section className="rounded-card border border-line bg-white p-4">
            <h2 className="text-sm font-bold text-rose-deep">
              기사별 조회
              <span className="ml-1.5 text-xs font-normal text-muted">
                {PERIOD_LABEL[days]}
              </span>
            </h2>
            {a.articles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                이 기간에 읽힌 기사가 없습니다
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-[16px]">
                  <thead>
                    <tr className="border-b border-line text-left text-muted">
                      <th scope="col" className="py-1.5 pr-2 font-bold">
                        제목
                      </th>
                      <th scope="col" className="py-1.5 pr-2 text-right font-bold">
                        조회
                      </th>
                      <th scope="col" className="py-1.5 pr-2 text-right font-bold">
                        방문자
                      </th>
                      <th scope="col" className="py-1.5 pr-2 text-right font-bold">
                        체류
                      </th>
                      <th scope="col" className="py-1.5 text-right font-bold">
                        읽음률
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.articles.map((r) => (
                      <tr key={r.slug} className="border-b border-line">
                        <td className="max-w-[220px] py-2 pr-2">
                          <Link
                            href={`/article/${r.slug}`}
                            className="line-clamp-2"
                          >
                            {r.category && (
                              <span className="mr-1 text-[15px] text-muted">
                                {r.category}
                              </span>
                            )}
                            {r.title}
                          </Link>
                        </td>
                        <td className="py-2 pr-2 text-right font-bold tabular-nums">
                          {r.views.toLocaleString()}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted">
                          {r.visitors.toLocaleString()}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted">
                          {r.avgDwellSec > 0 ? `${r.avgDwellSec}초` : "-"}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted">
                          {r.avgScroll > 0 ? `${r.avgScroll}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              체류는 기사 화면에 머문 평균 시간, 읽음률은 본문을 어디까지
              내렸는지의 평균입니다. 조회는 많은데 읽음률이 낮으면 제목이 끌고
              본문이 놓친 기사입니다.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
