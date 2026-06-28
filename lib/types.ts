// 앱 도메인 타입 (DB 스키마 기준). 추후 `supabase gen types`로 database.types.ts 생성 후 교체.

export type UserRole = "user" | "reporter" | "admin" | "superadmin";
export type OrgRole = "owner" | "staff" | "member";
export type ReviewStatus = "pending" | "approved" | "rejected";
// 기자 등급: 신청자(작성불가) / 준기자(승인후발행) / 정기자(즉시발행)
export type ReporterLevel = "applicant" | "junior" | "senior";

// 계정 등급(profiles.role) + 상태 + 소속(업체/단체 멤버십)
export interface Profile {
  id: string;
  nickname: string;
  neighborhood: string | null;
  avatar_url: string | null;
  role: UserRole;
  reporter_level?: ReporterLevel | null; // role='reporter'일 때만 의미
  is_suspended: boolean;
  deleted_at: string | null;
}

// 현재 로그인 사용자의 통합 신원(권한 판정에 필요한 소속 포함)
export interface CurrentUser extends Profile {
  // 승인된 본인 업체 (1인 1개) — 없으면 null
  business: { id: string; name: string; status: ReviewStatus } | null;
  // 가입한 단체 목록 (역할/상태 포함)
  orgs: { org_id: string; name: string; role: OrgRole; status: "pending" | "approved" | "rejected" }[];
}
