import FrontPageEditor from "@/components/admin/FrontPageEditor";
import { getFrontSlots, getLatestFront } from "@/lib/frontpage-data";

export const metadata = { title: "헤드라인 편성 · 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminFrontPage() {
  const [articles, slots] = await Promise.all([
    getLatestFront(),
    getFrontSlots(),
  ]);
  // 오래된 기사를 지정해 뒀어도 목록에서 보이도록 앞에 붙인다.
  const seen = new Set(articles.map((a) => a.slug));
  const picked = slots.flatMap((s) =>
    s.article && !seen.has(s.article.slug) ? [s.article] : [],
  );
  return <FrontPageEditor articles={[...picked, ...articles]} slots={slots} />;
}
