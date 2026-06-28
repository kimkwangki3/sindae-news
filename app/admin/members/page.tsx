import { getAdminMembers } from "@/lib/mock/admin";
import MemberManager from "@/components/admin/MemberManager";

export const metadata = { title: "회원 관리 · 관리자" };

export default async function AdminMembersPage() {
  return <MemberManager initial={await getAdminMembers()} />;
}
