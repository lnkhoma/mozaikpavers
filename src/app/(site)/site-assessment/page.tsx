import type { Metadata } from "next";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { SiteAssessmentForm, type LinkedQuote } from "@/components/site/site-assessment-form";
import { Icon } from "@/components/ui/icons";
import { QUOTE_NUMBER_PATTERN } from "@/lib/ids";
import { getQuotationForCustomer } from "@/lib/services/quotations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a Site Assessment",
  description: "Book a Mozaik Pavers site assessment to confirm measurements, ground conditions and your final quotation.",
  robots: { index: true, follow: true },
};

export default async function SiteAssessmentPage({ searchParams }: PageProps<"/site-assessment">) {
  const { quote, token } = await searchParams;
  let linked: LinkedQuote | undefined;
  if (typeof quote === "string" && typeof token === "string" && QUOTE_NUMBER_PATTERN.test(quote)) {
    const row = await getQuotationForCustomer(quote, token);
    if (row) {
      linked = {
        quoteNumber: row.quotation.quoteNumber,
        accessToken: token,
        fullName: row.customer.fullName,
        email: row.customer.email,
        phone: row.customer.phone,
        whatsapp: row.customer.whatsapp,
        location: row.quotation.projectLocation,
        projectType: row.quotation.projectType,
        squareMetres: row.quotation.squareMetres,
      };
    }
  }

  return (
    <div className="bg-sand-100 py-10 lg:py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="eyebrow">Site assessment</p>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Let&apos;s see your space</h1>
          <p className="mt-4 text-lg text-ink-600">
            An online estimate is based on the area you enter. A site assessment confirms everything that affects the final price.
          </p>
          <ul className="mt-6 space-y-4">
            {[
              ["ruler", "Confirmed measurements", "We measure the exact area, levels and falls."],
              ["layers", "Ground & site conditions", "Soil, existing surfaces and preparation needed."],
              ["shield", "Drainage planning", "Where water goes during the rainy season."],
              ["tag", "Final quotation", "A confirmed price with your chosen pavers."],
            ].map(([icon, title, text]) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-clay-700 shadow-sm">
                  <Icon name={icon as "ruler"} className="size-5" />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="text-ink-600">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CallLink source="site_assessment_page" className="btn btn-dark" />
            <WhatsAppLink source="site_assessment_page" />
          </div>
        </div>
        <SiteAssessmentForm linked={linked} />
      </div>
    </div>
  );
}
