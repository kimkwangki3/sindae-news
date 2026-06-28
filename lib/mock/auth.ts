// Phase 2 데모 인증. .env(Supabase) 미설정 시에만 동작하는 쿠키 기반 가짜 세션으로,
// 로그인 후 화면(아이덴티티바·마이페이지·댓글창 등)을 실제 카카오 OAuth 없이 미리 보기 위한 것.
// Supabase가 설정되면 이 경로는 전부 무시되고 lib/auth.ts가 실제 세션을 사용한다.

import type { CurrentUser } from "@/lib/types";

export type DemoPersona = "member" | "reporter" | "business" | "admin";

export const DEMO_COOKIE = "sindae_demo_user";

interface PersonaDef {
  label: string;
  desc: string;
  user: CurrentUser;
}

// 권한 조합을 한눈에 보기 위한 4종 페르소나(회원등급_설계.md 매트릭스 대응).
export const DEMO_PERSONAS: Record<DemoPersona, PersonaDef> = {
  member: {
    label: "일반회원",
    desc: "댓글·게시판·나눔·신고",
    user: {
      id: "demo-member",
      nickname: "이웃사랑",
      neighborhood: "신대동",
      avatar_url: null,
      role: "user",
      is_suspended: false,
      deleted_at: null,
      business: null,
      orgs: [],
    },
  },
  reporter: {
    label: "시민기자",
    desc: "+ 기사 작성·발행",
    user: {
      id: "demo-reporter",
      nickname: "김기자",
      neighborhood: "신대동",
      avatar_url: null,
      role: "reporter",
      reporter_level: "senior",
      is_suspended: false,
      deleted_at: null,
      business: null,
      orgs: [
        { org_id: "org-1", name: "신대주민자치회", role: "staff", status: "approved" },
      ],
    },
  },
  business: {
    label: "업체사장",
    desc: "+ 홍보글(승인업체)",
    user: {
      id: "demo-business",
      nickname: "분식왕",
      neighborhood: "신대동",
      avatar_url: null,
      role: "user",
      is_suspended: false,
      deleted_at: null,
      business: { id: "biz-1", name: "신대분식", status: "approved" },
      orgs: [],
    },
  },
  admin: {
    label: "관리자",
    desc: "전체 관리·승인",
    user: {
      id: "demo-admin",
      nickname: "편집장",
      neighborhood: null,
      avatar_url: null,
      role: "admin",
      is_suspended: false,
      deleted_at: null,
      business: null,
      orgs: [],
    },
  },
};

export const DEMO_PERSONA_KEYS = Object.keys(DEMO_PERSONAS) as DemoPersona[];

export function isDemoPersona(v: string | undefined): v is DemoPersona {
  return !!v && v in DEMO_PERSONAS;
}

export function getDemoUser(persona: string | undefined): CurrentUser | null {
  return isDemoPersona(persona) ? DEMO_PERSONAS[persona].user : null;
}
