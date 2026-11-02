import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FEATURES } from "@/lib/features";
import { MEDIA } from "@/lib/media";

const UTIL_LINK = "flex min-h-[32px] items-center";

// 오늘 날짜는 서버 기준 UTC가 아니라 한국시각으로 찍는다.
function todayLabel(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
  }).format(new Date());
}

// PC판 머리글: 날짜 줄 + 가운데 제호. 메뉴(DesktopNav)는 스크롤을 따라와야
// 하므로 이 블록 밖 형제로 둔다. 휴대폰은 TopBar·IdentityBar를 그대로 쓴다.
export default async function DesktopHeader() {
  const user = await getCurrentUser();
  const isStaff = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="hidden bg-ivory lg:block">
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="flex items-center justify-between border-b border-line py-1.5 text-[15px] text-muted">
          <p>
            <b className="font-normal text-ink">{todayLabel()}</b>
            <span className="ml-4">순천시 해룡면 신대·복성·선월지구</span>
          </p>
          <div className="flex items-center gap-4">
            {FEATURES.recruit && (
              <Link href="/recruit" className={UTIL_LINK}>
                기자모집
              </Link>
            )}
            {isStaff && (
              <Link href="/admin" className={`${UTIL_LINK} text-rose-deep`}>
                관리자
              </Link>
            )}
            {user ? (
              <Link href="/me" className={UTIL_LINK}>
                {user.nickname} 님
              </Link>
            ) : (
              <Link href="/login" className={UTIL_LINK}>
                로그인
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center py-5">
          <p className="text-[15px] leading-snug text-muted">
            해룡면 이웃들의 소식
            <br />
            지역 인터넷신문
          </p>
          <Link
            href="/"
            aria-label={`${MEDIA.name} 홈`}
            className="flex items-center gap-3 font-display text-[54px] font-black leading-none tracking-[0.06em] text-ink"
          >
            <svg
              viewBox="0 0 86 88"
              className="h-[46px] w-[46px] flex-shrink-0 text-rose-deep"
              aria-hidden
            >
              <rect
                x="10"
                y="10"
                width="66"
                height="58"
                rx="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
              />
              <path d="M30 68v12l14-12z" fill="currentColor" />
              <rect x="22" y="24" width="18" height="14" rx="3" fill="currentColor" />
              <path
                d="M46 26h18M46 33h18M22 46h42M22 54h42"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
            {MEDIA.name}
          </Link>
          <div className="text-right">
            <Link
              href="/tips"
              className="inline-flex min-h-[44px] items-center bg-rose-deep px-4 text-[16px] text-white"
            >
              기사제보
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
