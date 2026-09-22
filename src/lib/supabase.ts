import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * 개인용 단일 사용자 앱이므로 서버 사이드에서만 service_role 키로 DB에
 * 접근합니다. 이 파일은 "server-only"로 표시되어 있어 클라이언트 번들에
 * 실수로 포함되면 빌드가 실패합니다.
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
