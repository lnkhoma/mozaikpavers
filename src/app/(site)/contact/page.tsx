import type { Metadata } from "next";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { ContactForm } from "@/components/site/contact-form";
import { GET_IN_TOUCH } from "@/components/site/cta-band";
import { Icon } from "@/components/ui/icons";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Get in Touch",
  description: "Get in touch with Mozaik Pavers for friendly advice, product guidance or a quick quotation for your paving project.",
};

export default function ContactPage() {
  return (
    <div className="bg-sand-100 py-10 lg:py-16">
      <div className="container-page max-w-2xl">
        <p className="eyebrow">Get in touch with us</p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{GET_IN_TOUCH.title}</h1>
        <p className="mt-4 text-lg text-ink-600">{GET_IN_TOUCH.text}</p>

        <div className="mt-8">
          <ContactForm />
        </div>

        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-ink-600">
          <span>Prefer to talk?</span>
          {company.phones.map((p) => (
            <CallLink key={p.href} source="contact_page" href={p.href} className="inline-flex items-center gap-1.5 font-semibold text-ink-900 hover:text-clay-700">
              <Icon name="phone" className="size-4" /> {p.number}
            </CallLink>
          ))}
          <WhatsAppLink source="contact_page" className="inline-flex items-center gap-1.5 font-semibold text-moss-600 hover:text-moss-500">
            <Icon name="whatsapp" className="size-4" /> WhatsApp
          </WhatsAppLink>
        </p>
      </div>
    </div>
  );
}
