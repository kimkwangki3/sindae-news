// 지역단체 데이터 액세스 — Supabase 실연동.
// 주의: neighborhood/since는 스키마에 없음 → 기본값/파생.
import { createClient } from "@/lib/supabase/server";

export type OrgCategory = "self" | "volunteer" | "club" | "culture";

export const ORG_CAT_NAME: Record<OrgCategory, string> = {
  self: "주민자치",
  volunteer: "봉사",
  club: "동호회",
  culture: "종교·문화",
};

export interface OrgPost {
  id: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface PendingMember {
  id: string;
  name: string;
  neighborhood: string;
  motivation: string;
}

export interface OrgMember {
  id: string;
  name: string;
  role: "owner" | "staff" | "member";
}

export interface Organization {
  id: string;
  name: string;
  category: OrgCategory;
  memberCount: number;
  neighborhood: string;
  since: string;
  region: string;
  leader: string;
  contact: string;
  kakaoChannel: string | null;
  acceptJoin: boolean;
  intro: string;
  photoCount: number;
  posts: OrgPost[];
  pending: PendingMember[];
  members: OrgMember[];
}

function embeddedCount(v: unknown): number {
  if (Array.isArray(v) && v.length > 0)
    return Number((v[0] as { count?: number }).count ?? 0);
  return 0;
}

const LIST_COLS =
  "id, name, category, leader, region, contact, kakao_channel, accept_join, intro, created_at, org_members(count), org_photos(count)";

function toOrgSummary(r: Record<string, unknown>): Organization {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as OrgCategory,
    memberCount: embeddedCount(r.org_members),
    neighborhood: "",
    since: `${(r.created_at as string).slice(0, 4)}년`,
    region: (r.region as string) ?? "",
    leader: (r.leader as string) ?? "",
    contact: (r.contact as string) ?? "",
    kakaoChannel: (r.kakao_channel as string) ?? null,
    acceptJoin: Boolean(r.accept_join),
    intro: (r.intro as string) ?? "",
    photoCount: embeddedCount(r.org_photos),
    posts: [],
    pending: [],
    members: [],
  };
}

// 공개 목록 — 승인(approved) 단체만.
export async function getOrgs(
  category: OrgCategory | "all" = "all",
): Promise<Organization[]> {
  const supabase = createClient();
  let q = supabase
    .from("organizations")
    .select(LIST_COLS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (category !== "all") q = q.eq("category", category);
  const { data } = await q;
  return (data ?? []).map((r) => toOrgSummary(r as Record<string, unknown>));
}

export async function getOrg(id: string): Promise<Organization | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("organizations")
    .select(LIST_COLS)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!data) return null;

  const base = toOrgSummary(data as Record<string, unknown>);

  const [{ data: posts }, { data: mem }] = await Promise.all([
    supabase
      .from("org_posts")
      .select("id, title, category, body, created_at")
      .eq("org_id", id)
      .eq("visibility", "visible")
      .order("created_at", { ascending: false }),
    supabase
      .from("org_members")
      .select("id, role, status, apply_name, neighborhood, motivation")
      .eq("org_id", id),
  ]);

  base.posts = (posts ?? []).map((p) => {
    const row = p as {
      id: string;
      title: string;
      category: string | null;
      body: string | null;
      created_at: string;
    };
    return {
      id: row.id,
      category: row.category ?? "공지",
      title: row.title,
      body: row.body ?? "",
      createdAt: row.created_at.slice(0, 10).replace(/-/g, "."),
    };
  });

  const members = (mem ?? []) as {
    id: number;
    role: "owner" | "staff" | "member";
    status: "pending" | "approved" | "rejected";
    apply_name: string | null;
    neighborhood: string | null;
    motivation: string | null;
  }[];

  base.members = members
    .filter((m) => m.status === "approved")
    .map((m) => ({
      id: String(m.id),
      name: m.apply_name ?? "회원",
      role: m.role,
    }));
  base.pending = members
    .filter((m) => m.status === "pending")
    .map((m) => ({
      id: String(m.id),
      name: m.apply_name ?? "신청자",
      neighborhood: m.neighborhood ?? "",
      motivation: m.motivation ?? "",
    }));
  base.memberCount = base.members.length;

  return base;
}
