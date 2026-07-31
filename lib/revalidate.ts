import { revalidatePath } from "next/cache";

// 관리 액션이 공개 화면에 즉시 반영되게 한다.
//
// 왜 필요한가: 관리자 액션들이 revalidatePath("/admin/...")만 호출해서
// 관리자 화면은 갱신되는데 방문자가 보는 목록·상세는 그대로였다. 승인한
// 업체가 /district에 안 뜨고, 발행한 기사가 홈에 안 걸리고, 강제
// 새로고침을 해야 보이는 증상이 여기서 나왔다.
//
// 왜 경로를 하나하나 적지 않는가: /articles/[category], /article/[slug],
// /district/[id] 처럼 동적 경로가 많아 열거하면 반드시 빠뜨린다. 실제로
// 그렇게 빠져 있었다. 공개 페이지는 전부 dynamic이라 무효화 비용이
// 사실상 없고, 규모가 커져 선별이 필요해지면 그때 쪼개면 된다.
export function revalidatePublic(): void {
  revalidatePath("/", "layout");
}
