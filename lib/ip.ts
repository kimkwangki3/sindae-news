import { headers } from "next/headers";
import { createHash } from "crypto";

// 방문자 IP를 단방향 해시로. 좋아요/조회 중복 방지 키(개인정보 원문 미저장).
// 운영 시 IP_HASH_SALT를 .env에 설정하면 레인보우/추적 저항이 올라감.
export function getIpHash(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const ip =
    fwd.split(",")[0].trim() || h.get("x-real-ip") || "0.0.0.0";
  const salt = process.env.IP_HASH_SALT ?? "sindae-news";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}
