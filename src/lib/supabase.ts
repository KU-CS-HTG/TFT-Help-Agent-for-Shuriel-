import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * 개인용 단일 사용자 앱이므로 서버 사이드에서만 service_role 키로 DB에
 * 접근합니다. 이 파일 자체는 "server-only"를 쓰지 않습니다 — CLI 스크립트
 * (scripts/*.ts)가 tsx로 이 파일을 직접 import하는데, "server-only"는
 * Next.js 번들러를 거치지 않으면 항상 에러를 던지기 때문입니다. 대신
 * 이 함수를 호출하는 Next.js 쪽 진입점(src/lib/data.ts, "use server" 액션들)
 * 에서 서버 전용임을 보장합니다.
 */
export function getSupabaseServerClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다. .env.local을 확인하세요."
    );
  }

  cachedClient = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
