import { redirect } from "next/navigation";
import { getCurrentUser, isDemoMode } from "@/lib/auth";
import LoginPanel from "./LoginPanel";

export const metadata = { title: "로그인 · 해룡신문" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  // 콜백이 실패하면 /login?error=auth 로 돌려보낸다. 그동안은 이 값을 읽는
  // 곳이 없어서, 로그인이 조용히 처음 화면으로 되돌아온 것처럼 보였다.
  return (
    <LoginPanel demo={isDemoMode()} failed={searchParams.error === "auth"} />
  );
}
