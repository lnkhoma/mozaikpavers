"use client";

import type { ReactNode } from "react";
import { company, whatsappLink } from "@/config/company";
import { track } from "@/lib/analytics-client";
import { Icon } from "@/components/ui/icons";

export function CallLink({ className = "btn btn-dark", children, source, href = company.phoneHref }: { className?: string; children?: ReactNode; source: string; href?: string }) {
  return (
    <a href={href} className={className} onClick={() => track("phone_clicked", { source })}>
      {children ?? (
        <>
          <Icon name="phone" /> Call Mozaik Pavers
        </>
      )}
    </a>
  );
}

export function WhatsAppLink({
  className = "btn btn-whatsapp",
  children,
  message = "Hello Mozaik Pavers, I'd like to ask about paving my property.",
  source,
}: {
  className?: string;
  children?: ReactNode;
  message?: string;
  source: string;
}) {
  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("whatsapp_clicked", { source })}
    >
      {children ?? (
        <>
          <Icon name="whatsapp" /> WhatsApp Us
        </>
      )}
    </a>
  );
}
