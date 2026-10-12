"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { CallLink } from "@/components/analytics/contact-links";
import { company } from "@/config/company";
import { EXPLORE_LINKS } from "@/config/navigation";

const NAV = [
  { href: "/projects", label: "Our Projects" },
  { href: "/products", label: "Products" },
  { href: "/before-after", label: "Before & After" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Get in Touch" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // Menu state is tied to the path it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close the dropdown on Escape or a click/tap outside it.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-ink-200 bg-sand-50/95 backdrop-blur" : "border-transparent bg-sand-50"
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Link href="/" aria-label="Mozaik Pavers home" className="shrink-0">
          <Logo className="h-11 lg:h-14" priority />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-[0.95rem] font-semibold transition-colors ${
                active(item.href) ? "text-clay-700" : "text-ink-700 hover:text-ink-900"
              }`}
              aria-current={active(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CallLink source="header" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 hover:text-ink-900 xl:inline-flex">
            <Icon name="phone" className="size-4" /> {company.phone}
          </CallLink>
          <Link href="/quote" className="btn btn-primary btn-sm hidden sm:inline-flex">
            <Icon name="calculator" className="size-4" /> Get a Quotation
          </Link>
          <div ref={menuRef} className="relative lg:hidden">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-900 hover:bg-ink-100"
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls="explore-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpenOn(open ? null : pathname)}
            >
              <Icon name={open ? "x" : "menu"} className="size-6" />
            </button>

            {open && (
              <nav
                id="explore-menu"
                aria-label="Explore"
                className="absolute top-full right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right animate-fade-up overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-200"
              >
                <p className="border-b border-ink-100 px-5 pt-4 pb-3 text-xs font-bold tracking-widest text-ink-500 uppercase">Explore</p>
                <ul className="p-2">
                  {EXPLORE_LINKS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active(item.href) ? "page" : undefined}
                        className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-base font-semibold transition-colors ${
                          active(item.href) ? "bg-clay-50 text-clay-700" : "text-ink-800 hover:bg-sand-100"
                        }`}
                      >
                        {item.label}
                        <Icon name="chevronRight" className="size-4 text-ink-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>

    </header>
  );
}
