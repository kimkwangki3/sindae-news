import { getAdminEntities, getPendingPromos } from "@/lib/mock/admin";
import ApprovalManager from "@/components/admin/ApprovalManager";
import PromoApprovalList from "@/components/admin/PromoApprovalList";

export const metadata = { title: "상권/업체 관리 · 관리자" };

export default async function AdminBusinessPage() {
  const [rows, promos] = await Promise.all([
    getAdminEntities("business"),
    getPendingPromos(),
  ]);
  return (
    <>
      <ApprovalManager kind="business" initial={rows} />
      <div className="px-[18px] pb-6">
        <PromoApprovalList initial={promos} />
      </div>
    </>
  );
}
