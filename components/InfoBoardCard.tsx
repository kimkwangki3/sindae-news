import Link from "next/link";
import { getInfoPages } from "@/lib/info";

// 게시판 맨 위에 고정으로 붙는 생활정보 바로가기.
//
// 고정글 여러 개로 만들지 않고 한 덩어리로 둔 이유: 주민 글이 밀리지 않게
// 하면서도 항상 눈에 띄게 하려는 것이다. 공개된 항목이 없으면 아예 나오지
// 않으므로 빈 카드가 자리를 차지하지 않는다.
//
// 접어둔 채로 시작한다. 항목이 늘수록 카드가 길어져 정작 주민 글이 화면
// 아래로 밀려났다. 제목 줄을 누르면 펼쳐진다.
//
// details/summary를 쓴 이유는 이 동작에 자바스크립트가 필요 없어서다.
// 상태를 들고 있을 필요가 없으니 서버 컴포넌트 그대로 두면 되고, 화면이
// 다 뜨기 전에 눌러도 열린다. 여닫는 표시·키보드 조작도 브라우저가 맡는다.
export default async function InfoBoardCard() {
  const pages = await getInfoPages();
  if (pages.length === 0) return null;

  return (
    <details className="group mx-[18px] mt-4 rounded-card border border-line bg-ivory-2 p-4">
      {/* list-none + ::-webkit-details-marker 숨김 — 브라우저 기본 삼각형을
          지우고 오른쪽 화살표로 대신한다(사파리는 별도 규칙이 필요하다). */}
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        <h2 className="text-[19px] font-bold text-rose-deep">📌 생활정보</h2>
        <span className="flex items-center gap-1.5 text-[17px] text-muted">
          <span className="group-open:hidden">펼치기</span>
          <span className="hidden group-open:inline">접기</span>
          <span
            aria-hidden
            className="transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>

      <p className="mt-2 text-[17px] leading-relaxed text-muted">
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

      {/* 전체보기는 펼친 뒤에 보여준다. 제목 줄에 두면 링크를 누르려다
          카드가 접히거나, 카드를 접으려다 페이지가 넘어간다. */}
      <Link
        href="/info"
        className="mt-3 flex min-h-[44px] items-center justify-center rounded-element border border-line bg-white text-[17px] font-bold text-rose-deep"
      >
        생활정보 전체보기 ›
      </Link>
    </details>
  );
}
