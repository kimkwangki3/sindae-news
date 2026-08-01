import Link from "next/link";
import Thumb from "@/components/Thumb";
import AdSlot from "@/components/AdSlot";
import {
  getBusinesses,
  BIZ_CAT_NAME,
  type BizCategory,
} from "@/lib/mock/district";

export const metadata = { title: "해룡상권 · 해룡신문" };

const CHIPS: { key: BizCategory | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "food", label: "맛집" },
  { key: "cafe", label: "카페" },
  { key: "life", label: "생활·편의" },
  { key: "medical", label: "의료" },
];

export default async function DistrictPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const keys = CHIPS.map((c) => c.key);
  const cat = (
    keys.includes(searchParams.cat as BizCategory) ? searchParams.cat : "all"
  ) as BizCategory | "all";
  const stores = await getBusinesses(cat);

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] py-3">
        {CHIPS.map((c) => {
          const active = c.key === cat;
          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/district" : `/district?cat=${c.key}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[36px] items-center whitespace-nowrap rounded-full border px-3.5 text-sm ${
                active
                  ? "border-rose bg-rose text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="flex justify-end px-[18px]">
        <Link
          href="/district/business/register"
          className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3.5 text-sm font-bold text-white"
        >
          ＋ 업체 등록
        </Link>
      </div>

      <div className="px-[18px] pb-6 pt-3">
        <AdSlot slot="district-top" placeholder />

        <ul className="flex flex-col gap-3">
          {stores.map((s) => (
            <li key={s.id}>
              <Link
                href={`/district/${s.id}`}
                className="flex gap-3 rounded-card border border-line bg-white p-3"
              >
                <Thumb
                  src={s.photos[0]}
                  alt={s.name}
                  className="h-[76px] w-[76px] flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-ivory-2 px-2 py-0.5 text-[15px] font-bold text-muted">
                      {BIZ_CAT_NAME[s.category]}
                    </span>
                    {s.isPromoted && (
                      <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[15px] font-bold text-rose">
                        홍보
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1 line-clamp-1 text-[20px] font-bold">
                    {s.name}
                  </h4>
                  {/* 리뷰가 없으면 ★0 대신 안내 문구 — 0점으로 오해되지 않게 */}
                  <div className="mt-1.5 flex gap-2 text-[16px] text-muted">
                    {s.reviewCount > 0 ? (
                      <>
                        <span className="font-bold text-rose">
                          ★ {s.rating.toFixed(1)}
                        </span>
                        <span>리뷰 {s.reviewCount}</span>
                      </>
                    ) : (
                      <span>리뷰 없음</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
