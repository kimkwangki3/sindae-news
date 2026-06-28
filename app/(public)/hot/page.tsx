import HotList from "@/components/article/HotList";
import { getHot } from "@/lib/mock/articles";

export const metadata = { title: "🔥 핫소식 · 신대신문" };

export default async function HotPage() {
  const [day, week, month] = await Promise.all([
    getHot("day"),
    getHot("week"),
    getHot("month"),
  ]);
  const data = { day, week, month };

  return (
    <>
      <div className="border-b border-line px-[18px] py-3">
        <h1 className="text-[17px] text-rose-deep">🔥 핫소식</h1>
        <p className="mt-1 text-xs text-muted">지금 신대지구에서 가장 많이 본 기사</p>
      </div>
      <HotList data={data} />
    </>
  );
}
