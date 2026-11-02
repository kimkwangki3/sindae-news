import TopBar from "@/components/TopBar";
import IdentityBar from "@/components/IdentityBar";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import DesktopHeader from "@/components/desktop/DesktopHeader";
import DesktopNav from "@/components/desktop/DesktopNav";
import MainFrame from "@/components/desktop/MainFrame";
import VisitTracker from "@/components/VisitTracker";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { getCurrentUser } from "@/lib/auth";

// 공개 영역 공통 셸: 상단바 + 아이덴티티바 + (페이지 콘텐츠) + 하단탭.
// 모바일 우선 — 휴대폰은 최대 480px 컨테이너, 태블릿부터 폭을 넓히고(MainFrame)
// 1024px 이상은 PC판 머리글로 바뀐다. 주소는 하나다.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-app flex-col bg-ivory shadow-soft md:max-w-none md:shadow-none">
      <TopBar />
      <div className="lg:hidden">
        <IdentityBar user={user} />
      </div>
      <DesktopHeader />
      <DesktopNav />
      <MainFrame>{children}</MainFrame>
      <Footer />
      <BottomNav />
      <VisitTracker />
      <GoogleAnalytics />
    </div>
  );
}
