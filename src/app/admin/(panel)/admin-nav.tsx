"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";

const ITEMS: { href: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/leads", label: "Leads", icon: "users" },
  { href: "/admin/projects", label: "Projects", icon: "image" },
  { href: "/admin/pricing", label: "Pricing Settings", icon: "tag", adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 lg:px-3 lg:pb-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.filter((i) => isAdmin || !i.adminOnly).map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-clay-500 text-white" : "text-ink-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="size-5" /> {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
