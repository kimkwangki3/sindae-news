import Image from "next/image";
import Link from "next/link";

// 상단 고정 바: 로고 + 기자모집 뱃지 / 메뉴·검색. 반투명 + 블러.
export default function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ivory/90 px-[18px] py-3.5 backdrop-blur">
      {/* 로고를 키운 뒤로 360px에서 뱃지 두 개까지 한 줄에 안 들어간다.
          로고는 절대 줄이지 않고, 뱃지 줄만 가로 스크롤시켜 헤더 높이를 고정한다. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/"
          className="flex flex-shrink-0 items-center"
          aria-label="해룡신문 홈"
        >
          <Image
            src="/logo.svg"
            alt="해룡신문"
            width={126}
            height={34}
            priority
            className="h-[34px] w-auto"
          />
        </Link>
        <div className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
          <Link
            href="/recruit"
            className="flex-shrink-0 whitespace-nowrap rounded-full border border-[#EAD2D8] bg-rose-soft px-2.5 py-1 text-[16px] font-bold text-rose-deep"
          >
            기자모집
          </Link>
          <Link
            href="/tips"
            className="flex-shrink-0 whitespace-nowrap rounded-full border border-[#EAD2D8] bg-rose-soft px-2.5 py-1 text-[16px] font-bold text-rose-deep"
          >
            기사제보
          </Link>
        </div>
      </div>
      <Link
        href="/search"
        aria-label="검색"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-lg"
      >
        🔍
      </Link>
    </header>
  );
}
