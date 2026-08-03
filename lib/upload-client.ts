// 브라우저에서 이미지 한 장을 올리는 공통 절차.
//
// 서버액션으로 서명 URL을 받고(권한·버킷·확장자 검증은 거기서 끝난다),
// 브라우저가 Storage에 직접 올린 뒤 공개 URL을 돌려준다.
//
// 기존 ImageUpload 컴포넌트도 같은 절차를 쓰지만, 이미 여러 화면에서 잘 돌고
// 있어 이번에는 건드리지 않았다. 나중에 손볼 일이 생기면 그때 이 함수를
// 쓰도록 합치는 게 좋다.

import { createClient } from "@/lib/supabase/client";
import { createUploadUrl } from "@/lib/upload-actions";

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export async function uploadImage(
  file: File,
  bucket: string,
): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("image/"))
    return { error: "이미지 파일만 올릴 수 있어요." };
  if (file.size > MAX_IMAGE_BYTES)
    return { error: "파일이 너무 커요. 6MB 이하로 올려주세요." };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ticket = await createUploadUrl(bucket, ext);
  if (!ticket.ok || !ticket.path || !ticket.token || !ticket.bucket)
    return { error: ticket.error ?? "업로드에 실패했어요." };

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file);
  if (error) return { error: "업로드에 실패했어요. 다시 시도해 주세요." };

  if (!ticket.publicUrl) return { error: "업로드 주소를 받지 못했어요." };
  return { url: ticket.publicUrl };
}
