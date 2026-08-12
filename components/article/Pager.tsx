import Link from "next/link";

// 쪽 번호 이동. 서버 컴포넌트라 자바스크립트 없이도 동작한다.
//
// 한 번에 보여줄 번호 수. 모바일 360px에서 [이전][1][2][3][4][5][다음]이
// 한 줄에 들어가는 한계다.
const WINDOW = 5;

function pageNumbers(page: number, totalPages: number): number[] {
  const end = Math.min(totalPages, Math.max(page + 2, WINDOW));
  const start = Math.max(1, Math.min(page - 2, end - WINDOW + 1));
  const out: number[] = [];
  for (let n = start; n <= end; n += 1) out.push(n);
  return out;
}

// 손가락으로 눌러야 하므로 44px을 지킨다(모바일 터치 타깃).
const CELL =
  "flex h-11 min-w-[44px] items-center justify-center rounded-element border px-2 text-sm";

export default function Pager({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  // 1쪽은 쿼리 없이 — 같은 목록이 두 주소를 갖지 않게 한다(정규 주소).
  const href = (n: number) => (n <= 1 ? basePath : `${basePath}?p=${n}`);
  const numbers = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="기사 목록 쪽 이동"
      className="flex flex-wrap items-center justify-center gap-1.5 py-6"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={`${CELL} border-line bg-white text-muted`}>
          ‹
        </Link>
      ) : (
        <span aria-hidden className={`${CELL} border-line bg-white text-line`}>
          ‹
        </span>
      )}

      {numbers[0] > 1 && (
        <>
          <Link href={href(1)} className={`${CELL} border-line bg-white text-muted`}>
            1
          </Link>
          {numbers[0] > 2 && <span className="px-0.5 text-sm text-muted">…</span>}
        </>
      )}

      {numbers.map((n) => {
        const active = n === page;
        return (
          <Link
            key={n}
            href={href(n)}
            aria-current={active ? "page" : undefined}
            className={`${CELL} ${
              active
                ? "border-rose bg-rose font-bold text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {n}
          </Link>
        );
      })}

      {numbers[numbers.length - 1] < totalPages && (
        <>
          {numbers[numbers.length - 1] < totalPages - 1 && (
            <span className="px-0.5 text-sm text-muted">…</span>
          )}
          <Link href={href(totalPages)} className={`${CELL} border-line bg-white text-muted`}>
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={`${CELL} border-line bg-white text-muted`}>
          ›
        </Link>
      ) : (
        <span aria-hidden className={`${CELL} border-line bg-white text-line`}>
          ›
        </span>
      )}
    </nav>
  );
}
