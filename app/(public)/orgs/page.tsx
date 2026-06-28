import Link from "next/link";
import Thumb from "@/components/Thumb";
import { getOrgs, ORG_CAT_NAME, type OrgCategory } from "@/lib/mock/orgs";

export const metadata = { title: "지역단체 · 신대신문" };

const CHIPS: { key: OrgCategory | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "self", label: "주민자치" },
  { key: "volunteer", label: "봉사" },
  { key: "club", label: "동호회" },
  { key: "culture", label: "종교·문화" },
];

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: { cat?: string };
}) {
  const keys = CHIPS.map((c) => c.key);
  const cat = (
    keys.includes(searchParams.cat as OrgCategory) ? searchParams.cat : "all"
  ) as OrgCategory | "all";
  const orgs = await getOrgs(cat);

  return (
    <div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-[18px] py-3">
        {CHIPS.map((c) => {
          const active = c.key === cat;
          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/orgs" : `/orgs?cat=${c.key}`}
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

      <div className="flex items-center justify-between px-[18px]">
        <p className="text-[13px] text-muted">우리 동네 단체를 만나고 함께해요</p>
        <Link
          href="/orgs/register"
          className="flex min-h-[40px] items-center rounded-element bg-rose-deep px-3.5 text-sm font-bold text-white"
        >
          ＋ 단체 등록
        </Link>
      </div>

      <ul className="flex flex-col gap-3 px-[18px] pb-6 pt-3">
        {orgs.map((o) => (
          <li key={o.id}>
            <Link
              href={`/orgs/${o.id}`}
              className="flex gap-3 rounded-card border border-line bg-white p-3"
            >
              <Thumb alt={o.name} className="h-[76px] w-[76px] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="rounded-full bg-tag-org-bg px-2 py-0.5 text-[10px] font-bold text-tag-org-fg">
                  {ORG_CAT_NAME[o.category]}
                </span>
                <h4 className="mt-1 line-clamp-1 text-[15px] font-bold">
                  {o.name}
                </h4>
                <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
                  <span>회원 {o.memberCount}명</span>
                  <span>{o.neighborhood}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
