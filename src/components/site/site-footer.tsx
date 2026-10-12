import Link from "next/link";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { company } from "@/config/company";
import { EXPLORE_LINKS } from "@/config/navigation";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="texture-pavers pb-24 text-ink-300 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo tone="light" className="h-14" />
          <p className="max-w-xs text-sm leading-relaxed text-ink-400">
            Durable, beautifully finished paving for homes and businesses across Malawi.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <WhatsAppLink source="footer" className="btn btn-whatsapp btn-sm" />
            {company.social.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mozaik Pavers on ${s.name}`}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-white/15 text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon name={s.icon} className="size-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-bold tracking-widest text-white uppercase">Explore</h2>
          <ul className="space-y-2.5 text-sm">
            {EXPLORE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="hover:text-white">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-bold tracking-widest text-white uppercase">Get started</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/quote" className="hover:text-white">Generate a Quotation</Link></li>
            <li><Link href="/site-assessment" className="hover:text-white">Request Site Assessment</Link></li>
            <li><Link href="/contact" className="hover:text-white">Get in Touch</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-bold tracking-widest text-white uppercase">Contact</h2>
          <ul className="space-y-3 text-sm">
            {company.phones.map((p) => (
              <li key={p.href}>
                <CallLink source="footer" href={p.href} className="inline-flex items-center gap-2 hover:text-white">
                  <Icon name="phone" className="size-4 text-clay-400" /> {p.number}
                </CallLink>
              </li>
            ))}
            <li>
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 hover:text-white">
                <Icon name="mail" className="size-4 text-clay-400" /> {company.email}
              </a>
            </li>
            <li className="inline-flex items-start gap-2">
              <Icon name="mapPin" className="mt-0.5 size-4 shrink-0 text-clay-400" /> {company.address}
            </li>
            <li className="inline-flex items-start gap-2">
              <Icon name="clock" className="mt-0.5 size-4 shrink-0 text-clay-400" /> {company.hours}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {company.legalName}. All rights reserved.</p>
          <p>Online quotations are estimates and subject to site assessment.</p>
        </div>
      </div>
    </footer>
  );
}
