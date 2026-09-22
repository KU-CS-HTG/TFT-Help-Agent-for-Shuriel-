"use client";

export default function StageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 p-8 text-center text-neutral-200">
      <h1 className="text-lg font-semibold">데이터를 불러오지 못했습니다.</h1>
      <p className="max-w-md text-sm text-neutral-400">
        {error.message || "알 수 없는 오류가 발생했습니다."}
        <br />
        Supabase 환경변수(.env.local)가 올바르게 설정되어 있는지, DB 스키마가 적용되어 있는지 확인하세요.
        자세한 내용은 SETUP.md를 참고하세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        다시 시도
      </button>
    </div>
  );
}
