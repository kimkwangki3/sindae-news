import Link from "next/link";
import { getInfoPages } from "@/lib/info";

// 게시판 맨 위에 고정으로 붙는 생활정보 바로가기.
//
// 고정글 여러 개로 만들지 않고 한 덩어리로 둔 이유: 주민 글이 밀리지 않게
// 하면서도 항상 눈에 띄게 하려는 것이다. 공개된 항목이 없으면 아예 나오지
// 않으므로 빈 카드가 자리를 차지하지 않는다.
export default async function InfoBoardCard() {
  const pages = await getInfoPages();
  if (pages.length === 0) return null;

  return (
    <section className="mx-[18px] mt-4 rounded-card border border-line bg-ivory-2 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[19px] font-bold text-rose-deep">📌 생활정보</h2>
        <Link href="/info" className="text-[17px] text-muted">
          전체보기
        </Link>
      </div>
      <p className="mt-1 text-[17px] leading-relaxed text-muted">
        해룡면에 사는 데 필요한 것들. 계속 갱신합니다.
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/info/${p.slug}`}
              className="flex min-h-[44px] items-center gap-1.5 rounded-element border border-line bg-white px-3 text-[18px] text-ink"
            >
              <span aria-hidden>{p.icon ?? "📄"}</span>
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
