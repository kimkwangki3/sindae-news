// 관리자 화면 공용 타입(서버/클라이언트). 서버 전용 import 금지.
export type ArticleStatus = "published" | "draft";
export type CommentStatus = "visible" | "reported" | "hidden";
export type ReportStatus = "pending" | "resolved";
export type AdminRole = "user" | "reporter" | "admin" | "superadmin";

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
  neighborhood: string | null;
  joinedAt: string;
  isSuspended: boolean;
}
