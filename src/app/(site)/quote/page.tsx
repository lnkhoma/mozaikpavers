import type { Metadata } from "next";
import { QuoteWizard } from "@/components/quote/quote-wizard";
import { getPublicPricing } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Generate a Quotation",
  description: "Enter the area to be paved and get an instant, itemised paving quotation in Malawi Kwacha — emailed to you as a PDF.",
};

export default async function QuotePage({ searchParams }: PageProps<"/quote">) {
  const [{ values }, params] = await Promise.all([getPublicPricing(), searchParams]);
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
        <div className="mt-8">
          <QuoteWizard pricing={values} initialArea={initialArea} />
        </div>
      </div>
    </div>
  );
}
