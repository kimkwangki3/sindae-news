import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// 기자 공간 — role=reporter(신청자 포함) 또는 관리자만. 그 외 차단.
export default async function ReporterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed =
    user.role === "reporter" ||
    user.role === "admin" ||
    user.role === "superadmin";
  if (!allowed) redirect("/");

  return (
    <div className="mx-auto min-h-dvh max-w-screen-sm bg-ivory">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ivory/90 px-[18px] py-3.5 backdrop-blur">
        <Link href="/reporter" className="text-base font-bold text-rose-deep">
          ✍ 기자 공간
        </Link>
        <Link href="/" className="text-xs text-muted">
          신대신문 홈 ›
        </Link>
      </header>
      {children}
    </div>
  );
}
