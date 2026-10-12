import type { Metadata } from "next";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { QuoteWizard } from "@/components/quote/quote-wizard";
import { Icon } from "@/components/ui/icons";
import { getPublicPricing } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Generate a Quotation",
  description: "Enter the area to be paved and get an instant, itemised paving quotation in Malawi Kwacha — emailed to you as a PDF.",
};

export default async function QuotePage({ searchParams }: PageProps<"/quote">) {
  const [{ values, live }, params] = await Promise.all([getPublicPricing(), searchParams]);
  const raw = typeof params.area === "string" ? params.area : undefined;
  const initialArea = raw && /^\d{1,6}(\.\d{1,2})?$/.test(raw) ? raw : undefined;

  return (
    <div className="bg-sand-100 pb-16">
      <div className="container-page pt-8 lg:pt-12">
        <p className="eyebrow">Instant quotation</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Generate my quotation</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-600">
          Enter your area in square metres and we&apos;ll calculate every material, delivery and labour cost in Malawi Kwacha.
        </p>
        {!live && (
          <div role="alert" className="mt-6 flex flex-col gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex gap-3 text-amber-950">
              <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
              <span>
                <strong className="block">Online quotations are temporarily unavailable.</strong>
                You can still see an estimate below using our standard rates. To receive your quotation, please call or WhatsApp us.
              </span>
            </p>
            <span className="flex shrink-0 flex-wrap gap-2">
              <CallLink source="quote_unavailable" className="btn btn-dark btn-sm" />
              <WhatsAppLink source="quote_unavailable" className="btn btn-whatsapp btn-sm" />
            </span>
          </div>
        )}
        <div className="mt-8">
          <QuoteWizard pricing={values} initialArea={initialArea} />
        </div>
      </div>
    </div>
  );
}
