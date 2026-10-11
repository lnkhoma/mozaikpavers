"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { Icon } from "@/components/ui/icons";

/** Thumb-reachable Call · WhatsApp · Quote bar on phones. */
export function MobileActionBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/quote")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
        <CallLink source="mobile_bar" className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-bold text-ink-800 active:bg-ink-100">
          <Icon name="phone" className="size-5" /> Call
        </CallLink>
        <WhatsAppLink source="mobile_bar" className="flex min-h-12 flex-col items-center justify-center rounded-lg text-xs font-bold text-moss-600 active:bg-ink-100">
          <Icon name="whatsapp" className="size-5" /> WhatsApp
        </WhatsAppLink>
        <Link href="/quote" className="btn btn-primary min-h-12 px-3 text-sm">
          <Icon name="calculator" className="size-4" /> Get Quote
        </Link>
      </div>
    </div>
  );
}
