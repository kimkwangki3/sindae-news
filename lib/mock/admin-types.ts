// 관리자 화면 공용 타입(서버/클라이언트). 서버 전용 import 금지.
export type ArticleStatus = "published" | "draft" | "pending";
export type CommentStatus = "visible" | "reported" | "hidden";
export type ReportStatus = "pending" | "resolved";
export type AdminRole = "user" | "reporter" | "admin" | "superadmin";
export type ReporterLevel = "applicant" | "junior" | "senior";

export interface AdminStat {
  key: string;
  label: string;
  value: number;
}

export interface AdminArticleRow {
  slug: string;
  title: string;
  category: string; // 한글 카테고리명
  status: ArticleStatus;
  views: number | null; // 임시저장은 null
  date: string | null; // 발행일, 임시저장은 null
  author?: string; // 작성 기자
  reporterLevel?: ReporterLevel | null; // 작성자 기자 등급(승인 큐 표시용)
  pledged?: boolean; // 책임 서약 동의 여부
}

export interface AdminCommentRow {
  id: string;
  author: string;
  body: string;
  articleTitle: string;
  status: CommentStatus;
  reportCount: number;
  createdAt: string;
}

export interface AdminReportRow {
  id: string;
  targetType: "기사" | "댓글" | "게시글" | "나눔글";
  targetLabel: string;
  reason: string;
  reporter: string;
  status: ReportStatus;
  createdAt: string;
}

export interface AdminMemberRow {
  id: string;
  nickname: string;
  role: AdminRole;
  reporterLevel: ReporterLevel | null;
  neighborhood: string | null;
  joinedAt: string;
  isSuspended: boolean;
}

// --- 광고 ---
export type AdReqStatus = "pending" | "resolved" | "ignored";

export interface AdRequestRow {
  id: string;
  advertiser: string;
  slotLabel: string;
  duration: string;
  contact: string;
  linkUrl: string | null;
  status: AdReqStatus;
  createdAt: string;
}

export interface AdRow {
  id: string;
  advertiser: string;
  slotLabel: string;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdSlotOption {
  id: number;
  label: string;
}

// --- 커뮤니티 백오피스(게시판·나눔마켓 공용 + 제보) ---
export type PostKind = "board" | "market";
export type PostVisibility = "visible" | "hidden";

export interface AdminPostRow {
  id: string;
  title: string;
  author: string;
  category: string;
  visibility: PostVisibility;
  pinned: boolean;
  comments: number;
  extra: string; // 게시판=👍조회 / 나눔=동네·분류
  createdAt: string;
}

export type TipStatus = "pending" | "approved" | "rejected";

export interface AdminTipRow {
  id: string;
  title: string;
  body: string;
  category: string;
  contact: string;
  reporter: string;
  status: TipStatus;
  createdAt: string;
}

// --- 상권/업체 · 지역단체 (승인형) ---
export type ApprovalKind = "business" | "org";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AdminEntityRow {
  id: string;
  name: string;
  category: string;
  status: ApprovalStatus;
  sub: string; // 업체=대표·연락처 / 단체=대표·회원수
  createdAt: string;
}

export interface AdminPromoRow {
  id: string;
  title: string;
  business: string;
  status: ApprovalStatus;
  createdAt: string;
}

// --- 기자 신청·관리 ---
export interface AdminReporterAppRow {
  id: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string;
  neighborhood: string;
  interests: string;
  motivation: string;
  pledged: boolean;
  status: ApprovalStatus;
  createdAt: string;
}

export interface AdminReporterRow {
  id: string;
  nickname: string;
  level: ReporterLevel | null;
  articles: number;
  joinedAt: string;
}

// --- 정정보도 ---
export interface AdminCorrectionRow {
  id: string;
  articleTitle: string;
  reason: string;
  body: string;
  status: ApprovalStatus;
  createdAt: string;
}

// --- 통계·분석 ---
export interface ContentStatRow {
  id: string;
  slug?: string;
  title: string;
  category: string;
  status?: string;
  views: number;
  comments: number;
  reactions: number;
}

export interface CategoryTotal {
  category: string;
  count: number;
  views: number;
}

// --- 설정 ---
export interface AuditLogRow {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  memo: string;
  createdAt: string;
}

export interface SlotRow {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
}

export interface LegalPageRow {
  slug: string;
  title: string;
  body: string;
  updatedAt: string;
}
