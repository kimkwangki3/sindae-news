// ImageUpload가 hidden 필드에 줄바꿈(\n)으로 담아 보낸 URL 문자열 파싱.
// Supabase 공개 스토리지 URL만 허용(외부 URL 주입 방지) + 개수 제한.
export function parsePhotoUrls(raw: unknown, max: number): string[] {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//.test(s))
    .slice(0, max);
}
