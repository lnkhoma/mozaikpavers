import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { WhatsAppLink } from "@/components/analytics/contact-links";
import { CtaBand, PageHero } from "@/components/site/cta-band";
import { Icon } from "@/components/ui/icons";
import { PRODUCTS } from "@/config/products";

export const metadata: Metadata = {
  title: "Products",
  description: "Paving blocks, interlocking pavers, stepping stones, cross bridge covers, kerbs and precast Lego drains from Mozaik Pavers — what each product is and where it is used.",
};

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Products"
        title="Paving products, made to last"
        text="Everything that goes into a Mozaik Pavers surface — from the blocks you see to the edges and bedding you don't."
      >
        <nav aria-label="Products on this page" className="mt-6 -mx-4 overflow-x-auto px-4 pb-1">
          <ul className="flex w-max gap-2">
            {PRODUCTS.map((p) => (
              <li key={p.slug}>
                <a href={`#${p.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-ink-300 bg-white px-4 text-sm font-semibold whitespace-nowrap text-ink-700 hover:border-ink-500">
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHero>

      <section className="py-12 lg:py-20">
        <div className="container-page space-y-14 lg:space-y-20">
          {PRODUCTS.map((p, i) => (
            <article
              key={p.slug}
              id={p.slug}
              className="grid scroll-mt-24 items-center gap-8 md:grid-cols-[minmax(0,22rem)_1fr] lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-14"
            >
              <div className={`relative mx-auto w-full max-w-md md:max-w-none ${i % 2 ? "md:order-2" : ""}`}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-ink-200 shadow-card">
                  <Image
                    src={p.image.src}
                    alt={p.image.alt}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 1024px) 416px, (min-width: 768px) 352px, 448px"
                    className="object-cover"
                    style={{ objectPosition: p.image.focus ?? "center" }}
                  />
                </div>
                <span className="absolute top-4 left-4 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase backdrop-blur">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div>
                <p className="eyebrow">{p.tagline}</p>
                <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{p.name}</h2>
                <p className="mt-4 text-lg leading-relaxed text-ink-700">{p.description}</p>

                <h3 className="mt-6 text-sm font-bold tracking-wider text-ink-500 uppercase">How it&apos;s used</h3>
                <p className="mt-2 leading-relaxed text-ink-700">{p.howItsUsed}</p>

                <h3 className="mt-6 text-sm font-bold tracking-wider text-ink-500 uppercase">Best for</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {p.bestFor.map((b) => (
                    <li key={b} className="inline-flex items-center gap-1.5 rounded-lg bg-sand-100 px-3 py-1.5 text-sm font-semibold text-ink-700">
                      <Icon name="check" className="size-4 text-moss-500" /> {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/quote" className="btn btn-primary">
                    <Icon name="calculator" className="size-4" /> Get a quotation
                  </Link>
                  <WhatsAppLink
                    source={`product_${p.slug}`}
                    message={`Hello Mozaik Pavers, I'd like to know more about your ${p.name}.`}
                    className="btn btn-outline text-ink-900"
                  >
                    <Icon name="whatsapp" className="size-4" /> Ask about this product
                  </WhatsAppLink>
                  {p.projectSlug && (
                    <Link href={`/projects/${p.projectSlug}`} className="btn text-clay-700 hover:bg-clay-50">
                      See it installed <Icon name="arrowRight" className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CtaBand
        title="Not sure which product you need?"
        text="Tell us about your space — we'll recommend the right pavers and give you an itemised estimate."
        source="products_page"
      />
    </>
  );
}
