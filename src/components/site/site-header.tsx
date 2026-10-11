"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { CallLink } from "@/components/analytics/contact-links";
import { company } from "@/config/company";

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
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled || open ? "border-ink-200 bg-sand-50/95 backdrop-blur" : "border-transparent bg-sand-50"
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
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-900 hover:bg-ink-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            <Icon name={open ? "x" : "menu"} className="size-6" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-sand-50 lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-4">
            <Link href="/" className="border-b border-ink-200 py-4 text-lg font-semibold">Home</Link>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b border-ink-200 py-4 text-lg font-semibold ${active(item.href) ? "text-clay-700" : ""}`}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/site-assessment" className="border-b border-ink-200 py-4 text-lg font-semibold">
              Request Site Assessment
            </Link>
            <div className="mt-6 grid gap-3">
              <Link href="/quote" className="btn btn-primary btn-lg">
                <Icon name="calculator" /> Generate My Quotation
              </Link>
              <CallLink source="mobile_menu" className="btn btn-dark btn-lg" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
