import Link from "next/link";
import { WhatsAppLink } from "@/components/analytics/contact-links";
import { Icon } from "@/components/ui/icons";

export function CtaBand({
  title = "Want a transformation like this?",
  text = "Enter your area and get a detailed estimate in under two minutes — sent straight to your inbox as a PDF.",
  source,
}: {
  title?: string;
  text?: string;
  source: string;
}) {
  return (
    <section className="texture-pavers relative overflow-hidden">
      <div className="absolute -top-24 -right-24 size-72 rotate-12 bg-clay-500/25 blur-3xl" aria-hidden="true" />
      <div className="container-page relative flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between lg:py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h2>
          <p className="mt-3 text-lg text-ink-300">{text}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/quote" className="btn btn-primary btn-lg">
            <Icon name="calculator" /> Get Your Quote
          </Link>
          <WhatsAppLink source={source} className="btn btn-lg border-2 border-white/25 text-white hover:bg-white/10">
            <Icon name="whatsapp" /> WhatsApp Us
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}

export const GET_IN_TOUCH = {
  title: "Ready to start your own project?",
  text: "If you like what you've seen in our recent installations, our team is ready to help you plan yours. Get in touch for friendly advice, product guidance or a quick quotation for your upcoming project.",
};

/** Closing call to action after showcased work: talk to us, or get a quote. */
export function GetInTouchBand({ source }: { source: string }) {
  return (
    <section className="texture-pavers relative overflow-hidden">
      <div className="absolute -top-24 -right-24 size-72 rotate-12 bg-clay-500/25 blur-3xl" aria-hidden="true" />
      <div className="container-page relative flex flex-col items-start gap-6 py-14 lg:py-16 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">{GET_IN_TOUCH.title}</h2>
          <p className="mt-3 text-lg leading-relaxed text-ink-300">{GET_IN_TOUCH.text}</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/contact" className="btn btn-primary btn-lg whitespace-nowrap">
            <Icon name="mail" /> Get in Touch
          </Link>
          <Link href="/quote" className="btn btn-lg whitespace-nowrap border-2 border-white/25 text-white hover:bg-white/10">
            <Icon name="calculator" /> Quick Quotation
          </Link>
          <WhatsAppLink source={source} className="btn btn-lg whitespace-nowrap border-2 border-white/25 text-white hover:bg-white/10">
            <Icon name="whatsapp" /> WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </section>
  );
}

export function PageHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <section className="border-b border-ink-200 bg-sand-100">
      <div className="container-page py-12 lg:py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-lg text-ink-600">{text}</p>}
        {children}
      </div>
    </section>
  );
}
