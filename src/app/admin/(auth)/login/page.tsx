import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/session";
import { Logo } from "@/components/ui/logo";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdminUser()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="texture-pavers flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo tone="light" className="h-16" priority />
        </div>
        <div className="card p-7">
          <h1 className="text-2xl font-extrabold">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Authorised Mozaik Pavers personnel only.</p>
          <LoginForm next={typeof next === "string" ? next : ""} />
        </div>
      </div>
    </main>
  );
}
