import { redirect } from "next/navigation";
import { getCurrentUser, isDemoMode } from "@/lib/auth";
import LoginPanel from "./LoginPanel";

export const metadata = { title: "로그인 · 신대신문" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  return <LoginPanel demo={isDemoMode()} />;
}
