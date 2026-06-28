import { getCorrections } from "@/lib/mock/admin";
import CorrectionManager from "@/components/admin/CorrectionManager";

export const metadata = { title: "정정보도 관리 · 관리자" };

export default async function AdminCorrectionsPage() {
  const rows = await getCorrections();
  return <CorrectionManager initial={rows} />;
}
