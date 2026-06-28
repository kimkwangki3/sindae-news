import type { CurrentUser } from "./types";

// 회원등급_설계.md 의 3층 권한 모델 구현.
// ① 계정 등급(role) ② 소속(업체/단체 멤버십) ③ 상태(정지/탈퇴)
// 주의: 이 함수는 UI 가드용. 실제 보안은 DB의 RLS로 이중 방어한다.

export type Action =
  | "read"
  | "comment"
  | "write_board"
  | "write_market"
  | "report"
  | "write_article"
  | "write_promo"
  | "write_org_post"
  | "approve_member";

export interface PermissionTarget {
  authorId?: string | null;
  businessId?: string | null;
  orgId?: string | null;
}

function ownsApprovedBusiness(user: CurrentUser, businessId?: string | null) {
  if (!user.business || user.business.status !== "approved") return false;
  return !businessId || user.business.id === businessId;
}

function isOrgStaff(user: CurrentUser, orgId?: string | null) {
  return user.orgs.some(
    (o) =>
      o.status === "approved" &&
      (o.role === "owner" || o.role === "staff") &&
      (!orgId || o.org_id === orgId),
  );
}

export function can(
  user: CurrentUser | null,
  action: Action,
  target: PermissionTarget = {},
): boolean {
  // 비로그인(guest): 읽기만
  if (!user) return action === "read";

  // 탈퇴 계정: 전면 차단
  if (user.deleted_at) return action === "read";

  // 정지: 읽기 제외 모두 차단 (등급 무관하게 덮어씀)
  if (user.is_suspended && action !== "read") return false;

  // 관리자/슈퍼관리자: 전체 허용
  if (user.role === "admin" || user.role === "superadmin") return true;

  switch (action) {
    case "read":
      return true;
    case "comment":
    case "write_board":
    case "write_market":
    case "report":
      return true; // 로그인 회원이면 가능
    case "write_article":
      return (
        user.role === "reporter" &&
        (!target.authorId || target.authorId === user.id)
      );
    case "write_promo":
      return ownsApprovedBusiness(user, target.businessId);
    case "write_org_post":
    case "approve_member":
      return isOrgStaff(user, target.orgId);
    default:
      return false;
  }
}
