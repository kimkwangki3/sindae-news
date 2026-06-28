import TopBar from "@/components/TopBar";
import IdentityBar from "@/components/IdentityBar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

// 공개 영역 공통 셸: 상단바 + 아이덴티티바 + (페이지 콘텐츠) + 하단탭.
// 모바일 우선 — 최대 480px 컨테이너로 중앙 정렬, 큰 화면에서도 모바일 폭 유지.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col bg-ivory shadow-soft">
      <TopBar />
      <IdentityBar user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
