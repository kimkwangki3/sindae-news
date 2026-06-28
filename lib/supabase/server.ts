import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트 / Server Action / Route Handler 용 Supabase.
// 서버 컴포넌트에서는 쿠키 쓰기가 막혀 있으므로 try/catch로 무시한다(미들웨어에서 갱신).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출됨 — 미들웨어가 세션을 갱신하므로 무시 가능.
          }
        },
      },
    },
  );
}

// 관리자 작업 전용 (service role). 서버에서만 사용. RLS 우회 주의.
import { createClient as createAdminClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// 요청 컨텍스트(쿠키) 밖에서 쓰는 익명 읽기 클라이언트 — sitemap 등 빌드 시점용.
export function createAnonClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
