// 개인용 단일 비밀번호 인증.
// 미들웨어(Edge 런타임)와 서버 액션(Node 런타임) 양쪽에서 쓰이므로
// Web Crypto(SubtleCrypto)만 사용합니다 (양쪽 런타임 모두 지원).

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET 환경변수가 설정되어 있지 않습니다.");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(signature);
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `session:${expiresAt}`;
  const signature = await hmac(payload, getSecret());
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = await hmac(`session:${expiresAt}`, getSecret());
  return expected === signature;
}

export function checkPassword(input: string): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new Error("APP_PASSWORD 환경변수가 설정되어 있지 않습니다.");
  }
  return input === password;
}
