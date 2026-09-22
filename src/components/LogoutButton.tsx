"use client";

import { logoutAction } from "@/lib/actions/authActions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-700"
      >
        로그아웃
      </button>
    </form>
  );
}
