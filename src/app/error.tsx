"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <h1 className="text-3xl font-extrabold">Something went wrong</h1>
      <p className="max-w-md text-ink-600">
        Please try again. If the problem continues, call or WhatsApp us and we&apos;ll help straight away.
      </p>
      {error.digest && <p className="font-mono text-xs text-ink-400">Ref: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-dark">Try again</button>
        <Link href="/" className="btn btn-outline text-ink-900">Home</Link>
      </div>
    </main>
  );
}
