// 관리자 데이터 액세스 — Supabase 실연동.
// 관리자 화면은 레이아웃에서 admin/superadmin만 통과시키므로 service role로 조회(RLS 우회).
import { createServiceClient } from "@/lib/supabase/server";
import { CATEGORY_NAME, ID_TO_SLUG } from "@/lib/mock/articles-meta";
import type {
  ArticleStatus,
  AdminStat,
  AdminArticleRow,
  AdminCommentRow,
  AdminReportRow,
  AdminMemberRow,
  AdRequestRow,
  AdRow,
  AdSlotOption,
} from "@/lib/mock/admin-types";

export type {
  ArticleStatus,
  CommentStatus,
  ReportStatus,
  AdminRole,
  ReporterLevel,
  AdminStat,
  AdminArticleRow,
  AdminCommentRow,
  AdminReportRow,
  AdminMemberRow,
  AdReqStatus,
  AdRequestRow,
  AdRow,
  AdSlotOption,
} from "@/lib/mock/admin-types";

function fmtDate(ts: string | null): string | null {
  return ts ? ts.slice(5, 10).replace("-", ".") : null;
}
function fmtDateTime(ts: string): string {
  return `${ts.slice(5, 10).replace("-", ".")} ${ts.slice(11, 16)}`;
}
function catName(id: number | null): string {
  return id ? CATEGORY_NAME[ID_TO_SLUG[id]] ?? "" : "";
}

// --- 대시보드 통계 ----------------------------------------------------
export async function getAdminStats(): Promise<AdminStat[]> {
  const supabase = createServiceClient();
  const head = { count: "exact" as const, head: true };
  const [pub, dft, repCmt, pendRep] = await Promise.all([
    supabase.from("articles").select("*", head).eq("status", "published"),
    supabase.from("articles").select("*", head).eq("status", "draft"),
    supabase
      .from("reports")
      .select("*", head)
      .eq("target_type", "comment")
      .eq("status", "pending"),
    supabase.from("reports").select("*", head).eq("status", "pending"),
  ]);
  const published = pub.count ?? 0;
  const draft = dft.count ?? 0;
  const reportedComments = repCmt.count ?? 0;
  const pendingReports = pendRep.count ?? 0;
  return [
    { key: "published", label: "발행 기사", value: published },
    { key: "draft", label: "임시저장", value: draft },
    { key: "reported_comments", label: "신고 댓글", value: reportedComments },
    { key: "pending_reports", label: "미처리 신고", value: pendingReports },
  ];
}

// --- 기사 관리 --------------------------------------------------------
export async function getAdminArticles(
  status: ArticleStatus | "all" = "all",
): Promise<AdminArticleRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("articles")
    .select(
      "slug, title, category_id, status, view_count, published_at, created_at, pledge_ack, author:profiles(nickname, reporter_level)",
    )
    .in("status", ["published", "draft", "pending"])
    .order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      slug: string;
      title: string;
      category_id: number | null;
      status: ArticleStatus;
      view_count: number | null;
      published_at: string | null;
      pledge_ack: boolean | null;
      author?: { nickname?: string; reporter_level?: AdminMemberRow["reporterLevel"] } | null;
    };
    return {
      slug: row.slug,
      title: row.title,
      category: catName(row.category_id),
      status: row.status,
      views: row.status === "published" ? row.view_count ?? 0 : null,
      date: fmtDate(row.published_at),
      author: row.author?.nickname ?? "편집부",
      reporterLevel: row.author?.reporter_level ?? null,
      pledged: !!row.pledge_ack,
    };
  });
}

// --- 댓글 관리 --------------------------------------------------------
export async function getAdminComments(): Promise<AdminCommentRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, body, visibility, created_at, author:profiles(nickname), article:articles(title)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as {
    id: string;
    body: string;
    visibility: "visible" | "hidden";
    created_at: string;
    author?: { nickname?: string } | null;
    article?: { title?: string } | null;
  }[];

  // 댓글 신고 건수(미처리) 집계
  const { data: reps } = await supabase
    .from("reports")
    .select("target_id")
    .eq("target_type", "comment")
    .eq("status", "pending");
  const reportCount = new Map<string, number>();
  for (const r of (reps ?? []) as { target_id: string }[]) {
    reportCount.set(r.target_id, (reportCount.get(r.target_id) ?? 0) + 1);
  }

  return rows.map((c) => {
    const reports = reportCount.get(c.id) ?? 0;
    const status =
      c.visibility === "hidden"
        ? "hidden"
        : reports > 0
          ? "reported"
          : "visible";
    return {
      id: c.id,
      author: c.author?.nickname ?? "익명",
      body: c.body,
      articleTitle: c.article?.title ?? "",
      status,
      reportCount: reports,
      createdAt: fmtDateTime(c.created_at),
    };
  });
}

// --- 신고 관리 --------------------------------------------------------
const TARGET_LABEL: Record<string, AdminReportRow["targetType"]> = {
  article: "기사",
  comment: "댓글",
  board_post: "게시글",
  board_comment: "댓글",
  market_post: "나눔글",
  org_post: "게시글",
  promo_post: "게시글",
  business: "게시글",
  organization: "게시글",
};

export async function getAdminReports(): Promise<AdminReportRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, status, created_at, reporter:profiles!reporter_id(nickname)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      target_type: string;
      target_id: string;
      reason: string;
      status: "pending" | "resolved" | "ignored";
      created_at: string;
      reporter?: { nickname?: string } | null;
    };
    return {
      id: row.id,
      targetType: TARGET_LABEL[row.target_type] ?? "게시글",
      targetLabel: row.target_id,
      reason: row.reason,
      reporter: row.reporter?.nickname ?? "익명",
      status: row.status === "resolved" ? "resolved" : "pending",
      createdAt: fmtDateTime(row.created_at),
    };
  });
}

// --- 광고 관리 --------------------------------------------------------
function slotLabel(v: unknown): string {
  return (v as { label?: string } | null)?.label ?? "(슬롯 미지정)";
}

export async function getAdRequests(): Promise<AdRequestRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ad_requests")
    .select(
      "id, advertiser, duration, contact, link_url, status, created_at, slot:ad_slots(label)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      advertiser: string;
      duration: string | null;
      contact: string | null;
      link_url: string | null;
      status: AdRequestRow["status"];
      created_at: string;
      slot?: { label?: string } | null;
    };
    return {
      id: row.id,
      advertiser: row.advertiser,
      slotLabel: slotLabel(row.slot),
      duration: row.duration ?? "-",
      contact: row.contact ?? "-",
      linkUrl: row.link_url,
      status: row.status,
      createdAt: fmtDateTime(row.created_at),
    };
  });
}

export async function getAds(): Promise<AdRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ads")
    .select(
      "id, advertiser, link_url, is_active, created_at, slot:ad_slots(label)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      advertiser: string | null;
      link_url: string | null;
      is_active: boolean;
      created_at: string;
      slot?: { label?: string } | null;
    };
    return {
      id: row.id,
      advertiser: row.advertiser ?? "(광고주 미상)",
      slotLabel: slotLabel(row.slot),
      linkUrl: row.link_url,
      isActive: row.is_active,
      createdAt: fmtDate(row.created_at) ?? "",
    };
  });
}

export async function getAdSlots(): Promise<AdSlotOption[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ad_slots")
    .select("id, label")
    .order("id", { ascending: true });
  return (data ?? []).map((r) => {
    const row = r as { id: number; label: string };
    return { id: row.id, label: row.label };
  });
}

// --- 회원 관리 --------------------------------------------------------
export async function getAdminMembers(): Promise<AdminMemberRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, nickname, role, reporter_level, neighborhood, is_suspended, created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((r) => {
    const row = r as {
      id: string;
      nickname: string;
      role: AdminMemberRow["role"];
      reporter_level: AdminMemberRow["reporterLevel"];
      neighborhood: string | null;
      is_suspended: boolean;
      created_at: string;
    };
    return {
      id: row.id,
      nickname: row.nickname,
      role: row.role,
      reporterLevel: row.reporter_level ?? null,
      neighborhood: row.neighborhood,
      joinedAt: row.created_at.slice(0, 10).replace(/-/g, "."),
      isSuspended: row.is_suspended,
    };
  });
}
