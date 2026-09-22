"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export async function loginAction(_prevState: { error: string | null }, formData: FormData) {
  const password = String(formData.get("password") ?? "");

  let ok: boolean;
  try {
    ok = checkPassword(password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "서버 설정 오류" };
  }

  if (!ok) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/2-1");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
