import Link from "next/link";

// 로그인 필요 안내(작성 화면 공통). 비로그인 시 글쓰기 대신 노출.
export default function LoginRequired({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-muted">{message}</p>
      <Link
        href="/login"
        className="flex min-h-[48px] items-center rounded-element bg-rose-deep px-6 text-sm font-bold text-white"
      >
        카카오로 로그인
      </Link>
    </div>
  );
}
