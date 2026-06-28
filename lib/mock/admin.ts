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
  PostKind,
  PostVisibility,
  AdminPostRow,
  TipStatus,
  AdminTipRow,
  ApprovalKind,
  ApprovalStatus,
  AdminEntityRow,
  AdminPromoRow,
  AdminReporterAppRow,
  AdminReporterRow,
  AdminCorrectionRow,
  ReporterLevel,
  ContentStatRow,
  CategoryTotal,
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
  PostKind,
  PostVisibility,
  AdminPostRow,
  TipStatus,
  AdminTipRow,
  ApprovalKind,
  ApprovalStatus,
  AdminEntityRow,
  AdminPromoRow,
  AdminReporterAppRow,
  AdminReporterRow,
  AdminCorrectionRow,
  ContentStatRow,
  CategoryTotal,
} from "@/lib/mock/admin-types";

function embeddedCount(v: unknown): number {
  if (Array.isArray(v) && v.length > 0)
    return Number((v[0] as { count?: number }).count ?? 0);
  return 0;
}

function fmtDate(ts: string | null): string | null {
  return ts ? ts.slice(5, 10).replace("-", ".") : null;
}
function fmtDateTime(ts: string): string {
  return `${ts.slice(5, 10).replace("-", ".")} ${ts.slice(11, 16)}`;
}
function catName(id: number | null): string {
  return id ? CATEGORY_NAME[ID_TO_SLUG[id]] ?? "" : "";
}

// --- 사이드바 대기건수 배지 ------------------------------------------
export interface AdminQueueCounts {
  pendingArticles: number;
  pendingReports: number;
  newTips: number;
  pendingBusiness: number;
  pendingOrg: number;
  pendingReporterApps: number;
  pendingCorrections: number;
}

export async function getAdminQueueCounts(): Promise<AdminQueueCounts> {
  const supabase = createServiceClient();
  const head = { count: "exact" as const, head: true };
  const [a, r, t, b, o, ra, c] = await Promise.all([
    supabase.from("articles").select("*", head).eq("status", "pending"),
    supabase.from("reports").select("*", head).eq("status", "pending"),
    supabase.from("tips").select("*", head).eq("status", "pending"),
    supabase.from("businesses").select("*", head).eq("status", "pending"),
    supabase.from("organizations").select("*", head).eq("status", "pending"),
    supabase
      .from("reporter_applications")
      .select("*", head)
      .eq("status", "pending"),
    // corrections 테이블이 아직 없을 수 있어 best-effort
    supabase.from("corrections").select("*", head).eq("status", "pending"),
  ]);
  return {
    pendingArticles: a.count ?? 0,
    pendingReports: r.count ?? 0,
    newTips: t.count ?? 0,
    pendingBusiness: b.count ?? 0,
    pendingOrg: o.count ?? 0,
    pendingReporterApps: ra.count ?? 0,
    pendingCorrections: c.count ?? 0,
  };
}

// --- 커뮤니티 백오피스: 게시판/나눔마켓 글 + 제보 ---
function postAuthor(v: unknown): string {
  return (v as { nickname?: string } | null)?.nickname ?? "익명";
}

// 게시판/나눔마켓 공용 글 목록(관리자: 숨김글 포함)
export async function getAdminPosts(
  kind: PostKind,
  filter: "all" | "hidden" | "pinned" = "all",
): Promise<AdminPostRow[]> {
  const supabase = createServiceClient();
  if (kind === "board") {
    let q = supabase
      .from("board_posts")
      .select(
        "id, title, category, visibility, is_pinned, like_count, view_count, created_at, author:profiles(nickname), board_comments(count)",
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (filter === "hidden") q = q.eq("visibility", "hidden");
    if (filter === "pinned") q = q.eq("is_pinned", true);
    const { data } = await q;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        title: row.title as string,
        author: postAuthor(row.author),
        category: (row.category as string) ?? "",
        visibility: row.visibility as PostVisibility,
        pinned: Boolean(row.is_pinned),
        comments: embeddedCount(row.board_comments),
        extra: `👍${Number(row.like_count ?? 0)} 👁${Number(row.view_count ?? 0)}`,
        createdAt: fmtDateTime(row.created_at as string),
      };
    });
  }
  // market
  let q = supabase
    .from("market_posts")
    .select(
      "id, title, category, neighborhood, visibility, is_pinned, created_at, author:profiles(nickname), market_comments(count)",
    )
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (filter === "hidden") q = q.eq("visibility", "hidden");
  if (filter === "pinned") q = q.eq("is_pinned", true);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      author: postAuthor(row.author),
      category: (row.category as string) ?? "",
      visibility: row.visibility as PostVisibility,
      pinned: Boolean(row.is_pinned),
      comments: embeddedCount(row.market_comments),
      extra: `${(row.neighborhood as string) ?? "-"} · ${row.category}`,
      createdAt: fmtDateTime(row.created_at as string),
    };
  });
}

export async function getAdminTips(
  filter: "all" | TipStatus = "all",
): Promise<AdminTipRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("tips")
    .select(
      "id, title, body, category, contact, status, created_at, reporter:profiles(nickname)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      body: (row.body as string) ?? "",
      category: (row.category as string) ?? "",
      contact: (row.contact as string) ?? "-",
      reporter: postAuthor(row.reporter),
      status: row.status as TipStatus,
      createdAt: fmtDateTime(row.created_at as string),
    };
  });
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

// --- 상권/업체 · 지역단체 (승인형) -----------------------------------
export async function getAdminEntities(
  kind: ApprovalKind,
  filter: "all" | ApprovalStatus = "all",
): Promise<AdminEntityRow[]> {
  const supabase = createServiceClient();
  if (kind === "business") {
    let q = supabase
      .from("businesses")
      .select("id, name, category, status, phone, created_at, owner:profiles(nickname)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        name: row.name as string,
        category: (row.category as string) ?? "",
        status: row.status as ApprovalStatus,
        sub: `${postAuthor(row.owner)} · ${(row.phone as string) ?? "-"}`,
        createdAt: fmtDateTime(row.created_at as string),
      };
    });
  }
  let q = supabase
    .from("organizations")
    .select("id, name, category, status, created_at, owner:profiles(nickname), org_members(count)")
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: row.name as string,
      category: (row.category as string) ?? "",
      status: row.status as ApprovalStatus,
      sub: `${postAuthor(row.owner)} · 회원 ${embeddedCount(row.org_members)}`,
      createdAt: fmtDateTime(row.created_at as string),
    };
  });
}

// 홍보글 승인 대기(업체 홍보글은 승인돼야 공개)
export async function getPendingPromos(): Promise<AdminPromoRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("promo_posts")
    .select("id, title, status, created_at, business:businesses(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      business: (row.business as { name?: string } | null)?.name ?? "(업체)",
      status: row.status as ApprovalStatus,
      createdAt: fmtDateTime(row.created_at as string),
    };
  });
}

// --- 기자 신청·관리 --------------------------------------------------
export async function getReporterApplications(
  filter: "all" | ApprovalStatus = "all",
): Promise<AdminReporterAppRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("reporter_applications")
    .select(
      "id, user_id, name, phone, email, neighborhood, interests, motivation, pledge_agreed, status, created_at",
    )
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data } = await q;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      userId: (row.user_id as string) ?? null,
      name: row.name as string,
      phone: (row.phone as string) ?? "-",
      email: (row.email as string) ?? "-",
      neighborhood: (row.neighborhood as string) ?? "-",
      interests: Array.isArray(row.interests)
        ? (row.interests as string[]).join(", ")
        : "",
      motivation: (row.motivation as string) ?? "",
      pledged: Boolean(row.pledge_agreed),
      status: row.status as ApprovalStatus,
      createdAt: fmtDateTime(row.created_at as string),
    };
  });
}

// 활동 기자(role=reporter) + 작성 기사 수
export async function getActiveReporters(): Promise<AdminReporterRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, nickname, reporter_level, created_at")
    .eq("role", "reporter")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as {
    id: string;
    nickname: string;
    reporter_level: AdminReporterRow["level"];
    created_at: string;
  }[];

  // 작성 기사 수(기자별 count)
  return Promise.all(
    rows.map(async (r) => {
      const { count } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true })
        .eq("author_id", r.id);
      return {
        id: r.id,
        nickname: r.nickname,
        level: r.reporter_level ?? null,
        articles: count ?? 0,
        joinedAt: r.created_at.slice(0, 10).replace(/-/g, "."),
      };
    }),
  );
}

// --- 정정보도 --------------------------------------------------------
export async function getCorrections(
  filter: "all" | ApprovalStatus = "all",
): Promise<AdminCorrectionRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("corrections")
    .select("id, reason, body, status, created_at, article:articles(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) return []; // 테이블 미생성 시 안전
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      articleTitle:
        (row.article as { title?: string } | null)?.title ?? "(연결 기사 없음)",
      reason: (row.reason as string) ?? "",
      body: (row.body as string) ?? "",
      status: row.status as ApprovalStatus,
      createdAt: fmtDateTime(row.created_at as string),
    };
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

// --- 통계·분석 / 대시보드 인기 콘텐츠 -------------------------------
// 기사별 통계(조회·댓글·공감). 통계 페이지 + 대시보드 인기 기사 공용.
export async function getArticleStatsList(
  limit = 500,
): Promise<ContentStatRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("articles")
    .select(
      "id, slug, title, category_id, status, view_count, comments(count), article_reactions(count)",
    )
    .order("view_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      category: catName(row.category_id as number | null),
      status: row.status as string,
      views: Number(row.view_count ?? 0),
      comments: embeddedCount(row.comments),
      reactions: embeddedCount(row.article_reactions),
    };
  });
}

// 인기 게시글(좋아요·조회·댓글)
export async function getBoardStatsList(
  limit = 100,
): Promise<ContentStatRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("board_posts")
    .select("id, title, category, like_count, view_count, board_comments(count)")
    .eq("visibility", "visible")
    .order("view_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      title: row.title as string,
      category: (row.category as string) ?? "",
      views: Number(row.view_count ?? 0),
      comments: embeddedCount(row.board_comments),
      reactions: Number(row.like_count ?? 0),
    };
  });
}

// 카테고리별 합계(발행 기사 기준)
export async function getCategoryTotals(): Promise<CategoryTotal[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("articles")
    .select("category_id, view_count")
    .eq("status", "published");
  const map = new Map<string, { count: number; views: number }>();
  for (const r of (data ?? []) as {
    category_id: number | null;
    view_count: number | null;
  }[]) {
    const name = catName(r.category_id);
    const cur = map.get(name) ?? { count: 0, views: 0 };
    cur.count += 1;
    cur.views += r.view_count ?? 0;
    map.set(name, cur);
  }
  return [...map.entries()].map(([category, v]) => ({
    category,
    count: v.count,
    views: v.views,
  }));
}
