import { getSlots } from "@/lib/mock/admin";
import { CATEGORY_NAME } from "@/lib/mock/articles-meta";
import SettingsView from "@/components/admin/SettingsView";

export const metadata = { title: "카테고리·광고슬롯 · 관리자" };

export default async function AdminSettingsPage() {
  const slots = await getSlots();
  const categories = Object.entries(CATEGORY_NAME).map(([slug, name]) => ({
    slug,
    name,
  }));
  return <SettingsView categories={categories} slots={slots} />;
}
