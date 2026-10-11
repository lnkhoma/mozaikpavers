import Image from "next/image";
import Link from "next/link";
import { CallLink, WhatsAppLink } from "@/components/analytics/contact-links";
import { BeforeAfterPair } from "@/components/projects/before-after-pair";
import { ProjectCard } from "@/components/projects/project-card";
import { GetInTouchBand } from "@/components/site/cta-band";
import { Icon } from "@/components/ui/icons";
import { HOW_IT_WORKS, SERVICES, TESTIMONIALS, WHY_CHOOSE } from "@/config/content";
import { getFeaturedProjects, getPublishedProjects } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, all] = await Promise.all([getFeaturedProjects(6), getPublishedProjects()]);
  const transformations = all.filter((p) => p.before && p.after).slice(0, 3);
  const gallery = all.filter((p) => p.after).slice(0, 8);

  return (
    <>
      {/* ------------------------------ Hero ------------------------------ */}
      <section className="texture-pavers relative isolate overflow-hidden">
        <div className="absolute -top-32 -right-32 -z-10 size-[28rem] rounded-full bg-clay-500/20 blur-3xl" aria-hidden="true" />
        <div className="container-page py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl animate-fade-up">
            <p className="eyebrow text-sand-400 before:shadow-[0.85rem_0_0_var(--color-sand-400)]">Paving specialists · Malawi</p>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-extrabold text-white sm:text-6xl xl:text-7xl">
              Transform Your Space with <span className="text-clay-500">Mozaik Pavers</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-200 sm:text-xl">
              Quality paving solutions designed for beautiful, durable and professionally finished outdoor spaces.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className="btn btn-primary btn-lg">
                <Icon name="calculator" /> Get an Instant Quotation
              </Link>
              <Link href="/projects" className="btn btn-lg border-2 border-white/30 text-white hover:bg-white/10">
                View Our Projects <Icon name="arrowRight" />
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-200">
              {["Itemised quote in 2 minutes", "PDF sent to your inbox", "Residential & commercial"].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <Icon name="check" className="size-4 text-clay-400" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------- Quick actions ------------------------- */}
      <section className="border-b border-ink-200 bg-white">
        <div className="container-page grid gap-px bg-ink-200 sm:grid-cols-3">
          <Link href="/quote" className="group flex items-center gap-4 bg-white px-2 py-5 sm:px-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-clay-50 text-clay-700"><Icon name="calculator" className="size-6" /></span>
            <span>
              <span className="block font-bold group-hover:text-clay-700">Generate my quotation</span>
              <span className="text-sm text-ink-500">Instant, itemised estimate</span>
            </span>
          </Link>
          <Link href="/site-assessment" className="group flex items-center gap-4 bg-white px-2 py-5 sm:px-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-sand-100 text-ink-800"><Icon name="ruler" className="size-6" /></span>
            <span>
              <span className="block font-bold group-hover:text-clay-700">Request a site assessment</span>
              <span className="text-sm text-ink-500">We measure and confirm on site</span>
            </span>
          </Link>
          <WhatsAppLink source="home_quick_actions" className="group flex items-center gap-4 bg-white px-2 py-5 sm:px-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-moss-500/10 text-moss-600"><Icon name="whatsapp" className="size-6" /></span>
            <span>
              <span className="block font-bold group-hover:text-moss-600">Chat on WhatsApp</span>
              <span className="text-sm text-ink-500">Send photos, ask questions</span>
            </span>
          </WhatsAppLink>
        </div>
      </section>

      {/* ------------------------- Before & After ------------------------ */}
      {transformations.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="container-page">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">Before &amp; after</p>
                <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">See the transformation</h2>
                <p className="mt-3 text-lg text-ink-600">From bare ground to finished paving. Open any project to compare the photos with the slider.</p>
              </div>
              <Link href="/before-after" className="inline-flex items-center gap-1 font-bold text-clay-700 hover:text-clay-800">
                All transformations <Icon name="arrowRight" className="size-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {transformations.map((p, i) => (
                <BeforeAfterPair
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  location={p.location}
                  before={p.before!}
                  after={p.after!}
                  squareMetres={p.squareMetres}
                  paverType={p.paverType}
                  priority={i < 2}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------ Featured projects ----------------------- */}
      {featured.length > 0 && (
        <section className="bg-sand-100 py-16 lg:py-24">
          <div className="container-page">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Featured work</p>
                <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Recent Mozaik Pavers projects</h2>
              </div>
              <Link href="/projects" className="inline-flex items-center gap-1 font-bold text-clay-700 hover:text-clay-800">
                All projects <Icon name="arrowRight" className="size-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 3).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- Why choose --------------------------- */}
      <section className="py-16 lg:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Why Mozaik Pavers</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Paving that looks good on day one — and year ten</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHOOSE.map((w) => (
              <div key={w.title} className="rounded-2xl border border-ink-200 bg-white p-6">
                <span className="flex size-12 items-center justify-center rounded-xl bg-ink-900 text-sand-400"><Icon name={w.icon} className="size-6" /></span>
                <h3 className="mt-5 text-lg font-bold">{w.title}</h3>
                <p className="mt-2 text-ink-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Services ---------------------------- */}
      <section className="texture-pavers py-16 text-white lg:py-24">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-sand-400 before:shadow-[0.85rem_0_0_var(--color-sand-400)]">Services</p>
              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Everything from base to finish</h2>
            </div>
            <Link href="/services" className="inline-flex items-center gap-1 font-bold text-sand-400 hover:text-white">
              Our services <Icon name="arrowRight" className="size-4" />
            </Link>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="bg-ink-900 p-6 sm:p-8">
                <Icon name={s.icon} className="size-7 text-clay-400" />
                <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-ink-300">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------- Testimonials -------------------------- */}
      {TESTIMONIALS.length > 0 && (
        <section className="bg-sand-100 py-16 lg:py-24">
          <div className="container-page">
            <p className="eyebrow">What customers say</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Trusted by homeowners and businesses</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {TESTIMONIALS.map((t) => (
                <figure key={t.quote} className="card flex flex-col p-6">
                  <div className="flex gap-0.5 text-clay-500" aria-hidden="true">
                    {Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" className="size-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 flex-1 text-ink-700">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-sm">
                    <span>
                      <span className="block font-bold">{t.name}</span>
                      <span className="text-ink-500">{t.project} · {t.city}</span>
                    </span>
                    {t.sample && <span className="rounded bg-ink-100 px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-ink-500 uppercase">Sample</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------- Project gallery ------------------------ */}
      {gallery.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Gallery</p>
                <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Finished spaces</h2>
              </div>
              <Link href="/projects" className="hidden items-center gap-1 font-bold text-clay-700 sm:inline-flex">
                Browse all <Icon name="arrowRight" className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
              {gallery.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug}`}
                  className={`group relative overflow-hidden rounded-xl bg-ink-200 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                >
                  <Image src={p.after!.url} alt={p.after!.alt || p.name} fill loading="lazy" sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-3 text-sm font-bold text-white">
                    {p.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- How it works -------------------------- */}
      <section className="border-t border-ink-200 bg-white py-16 lg:py-24">
        <div className="container-page">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">From estimate to finished paving</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl bg-sand-100 p-6">
                <span className="font-display text-5xl font-extrabold text-clay-500/30">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-ink-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/quote" className="btn btn-primary btn-lg"><Icon name="calculator" /> Generate My Quotation</Link>
            <CallLink source="home_how_it_works" className="btn btn-outline btn-lg text-ink-900" />
          </div>
        </div>
      </section>

      <GetInTouchBand source="home_footer_cta" />
    </>
  );
}
