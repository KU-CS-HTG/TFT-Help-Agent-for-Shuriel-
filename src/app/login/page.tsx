"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/authActions";

const initialState: { error: string | null } = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl"
      >
        <h1 className="mb-1 text-xl font-semibold text-neutral-100">TFT 증강체 티어 정리</h1>
        <p className="mb-6 text-sm text-neutral-400">개인용 도구입니다. 비밀번호를 입력하세요.</p>

        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="비밀번호"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-indigo-500"
        />

        {state.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "확인 중..." : "입장"}
        </button>
      </form>
    </div>
  );
}
