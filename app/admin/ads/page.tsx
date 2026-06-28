import { getAdRequests, getAds, getAdSlots } from "@/lib/mock/admin";
import AdManager from "@/components/admin/AdManager";

export const metadata = { title: "광고 관리 · 관리자" };

export default async function AdminAdsPage() {
  const [requests, ads, slots] = await Promise.all([
    getAdRequests(),
    getAds(),
    getAdSlots(),
  ]);
  return <AdManager requests={requests} ads={ads} slots={slots} />;
}
