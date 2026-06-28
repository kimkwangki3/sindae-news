import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";

// 관리자 셸: admin/superadmin만 접근(UI 가드). 실제 보안은 RLS로 이중 방어.
// 공개 레이아웃과 분리된 라우트 그룹이라 하단탭/아이덴티티바가 붙지 않는다.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "superadmin") redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col bg-ivory lg:max-w-5xl lg:flex-row">
      {/* 브랜드 + 네비 (모바일: 상단 가로스크롤, lg: 좌측 사이드바) */}
      <header className="sticky top-0 z-20 border-b border-line bg-white lg:static lg:w-56 lg:flex-shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-[18px] py-3 lg:block">
          <p className="text-base font-bold text-rose-deep">
            신대신문 <span className="text-[11px] font-normal text-muted">관리자</span>
          </p>
          <span className="text-xs text-muted">{user.nickname} 님</span>
        </div>
        <AdminNav />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
