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
