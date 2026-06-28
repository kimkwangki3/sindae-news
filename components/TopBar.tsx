import Image from "next/image";
import Link from "next/link";

// 상단 고정 바: 로고 + 기자모집 뱃지 / 메뉴·검색. 반투명 + 블러.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ivory/90 px-[18px] py-3.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center" aria-label="신대신문 홈">
          <Image
            src="/logo.svg"
            alt="신대신문"
            width={96}
            height={26}
            priority
            className="h-[26px] w-auto"
          />
        </Link>
        <Link
          href="/recruit"
          className="rounded-full border border-[#EAD2D8] bg-rose-soft px-2.5 py-1 text-[11px] font-bold text-rose-deep"
        >
          ✍ 기자모집
        </Link>
      </div>
      <div className="flex items-center gap-3.5 text-lg">
        <button
          type="button"
          aria-label="메뉴"
          className="flex h-11 w-11 items-center justify-center"
        >
          ☰
        </button>
        <Link
          href="/search"
          aria-label="검색"
          className="flex h-11 w-11 items-center justify-center"
        >
          🔍
        </Link>
      </div>
    </header>
  );
}
