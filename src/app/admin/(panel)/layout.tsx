import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { requireAdmin } from "@/lib/auth/session";
import { logoutAction } from "../actions";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Mozaik Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ink-100 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="texture-pavers text-ink-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-6">
          <Link href="/admin" aria-label="Dashboard"><Logo tone="light" className="h-10" /></Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Sign out">
              <Icon name="logout" />
            </button>
          </form>
        </div>
        <AdminNav isAdmin={user.role === "admin"} />
        <div className="mt-auto hidden border-t border-white/10 p-5 lg:block">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-ink-400">{user.email}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/" target="_blank" className="btn btn-sm flex-1 border border-white/15 text-ink-200 hover:bg-white/10">
              <Icon name="external" className="size-4" /> Site
            </Link>
            <form action={logoutAction} className="flex-1">
              <button className="btn btn-sm w-full border border-white/15 text-ink-200 hover:bg-white/10">
                <Icon name="logout" className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
