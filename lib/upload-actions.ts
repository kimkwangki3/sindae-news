"use server";

import { randomUUID } from "crypto";
import { getCurrentUser } from "./auth";
import { canWriteArticle } from "./permissions";
import { createServiceClient } from "./supabase/server";

type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;
function isAdmin(u: NonNullable<SessionUser>): boolean {
  return u.role === "admin" || u.role === "superadmin";
}

// 이미지 업로드용 서명 URL 발급.
// 클라이언트는 이 URL로 Storage에 직접 업로드(요청 크기 제한·RLS insert 정책 불필요),
// 권한은 여기서 service role 발급 전에 검증한다.

const ALLOWED_BUCKETS = ["articles", "board", "market", "business", "org", "ads"] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export interface UploadTicket {
  ok?: boolean;
  error?: string;
  bucket?: string;
  path?: string;
  token?: string;
  publicUrl?: string;
}

// 버킷별 업로드 권한 확인
function canUpload(bucket: Bucket, user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  if (!user) return false;
  if (bucket === "ads") return isAdmin(user); // 배너는 관리자만(광고신청은 ads 버킷 공유 → 아래 예외)
  if (bucket === "articles") return canWriteArticle(user) || isAdmin(user);
  return true; // board/market/business/org → 로그인 회원
}

export async function createUploadUrl(
  bucket: string,
  ext: string,
): Promise<UploadTicket> {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  if (!ALLOWED_BUCKETS.includes(bucket as Bucket))
    return { error: "허용되지 않은 저장소입니다." };
  const b = bucket as Bucket;

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_EXT.has(cleanExt))
    return { error: "이미지 파일(jpg/png/webp/gif)만 올릴 수 있어요." };

  // ads 버킷은 관리자(배너) 또는 업체등록 회원(광고신청)만
  const allowed =
    b === "ads"
      ? isAdmin(user) || !!user.business
      : canUpload(b, user);
  if (!allowed) return { error: "이 이미지를 올릴 권한이 없습니다." };

  const path = `${user.id}/${randomUUID()}.${cleanExt}`;
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(b)
    .createSignedUploadUrl(path);
  if (error || !data) return { error: "업로드 준비에 실패했습니다." };

  const { data: pub } = supabase.storage.from(b).getPublicUrl(path);
  return {
    ok: true,
    bucket: b,
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  };
}
