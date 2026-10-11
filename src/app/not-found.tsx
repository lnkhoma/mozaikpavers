import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-sand-100 px-4 text-center">
      <Logo className="h-20" />
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="max-w-md text-ink-600">The page you&apos;re looking for has moved or no longer exists.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-dark">Go home</Link>
        <Link href="/quote" className="btn btn-primary">Get a quotation</Link>
      </div>
    </main>
  );
}
