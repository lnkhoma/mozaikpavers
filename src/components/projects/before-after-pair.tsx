import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { ProjectImage } from "@/lib/db/schema";
import { formatNumber } from "@/lib/format";

interface Props {
  slug: string;
  name: string;
  location: string;
  before: ProjectImage;
  after: ProjectImage;
  squareMetres?: number | null;
  paverType?: string | null;
  description?: string;
  priority?: boolean;
}

/**
 * Compact before → after card: two small photos joined by a dashed
 * connector and arrow badge. Links to the project page, which has the
 * full interactive slider.
 */
export function BeforeAfterPair({ slug, name, location, before, after, squareMetres, paverType, description, priority = false }: Props) {
  const facts = [squareMetres ? `${formatNumber(squareMetres)} SQM` : null, paverType].filter(Boolean).join(" · ");
  return (
    <Link href={`/projects/${slug}`} className="group card flex flex-col p-4 transition-shadow hover:shadow-lift sm:p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Thumb image={before} label="Before" tone="before" priority={priority} />
        <Connector />
        <Thumb image={after} label="After" tone="after" priority={priority} />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-clay-700 uppercase">
          <Icon name="mapPin" className="size-3.5" /> {location}
        </p>
        <h3 className="mt-1 text-lg font-extrabold group-hover:text-clay-700">{name}</h3>
        {description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">{description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-sm">
          <span className="truncate font-semibold text-ink-600">{facts}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-bold text-clay-700">
            Compare <Icon name="arrowRight" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Thumb({ image, label, tone, priority }: { image: ProjectImage; label: string; tone: "before" | "after"; priority: boolean }) {
  const ratio = image.width && image.height ? `${image.width}/${image.height}` : "3/4";
  return (
    <figure className="relative">
      <div
        className={`relative overflow-hidden rounded-xl bg-ink-200 ring-2 ${tone === "after" ? "ring-clay-500" : "ring-ink-200"}`}
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={image.url}
          alt={image.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 42vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <figcaption
        className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-white uppercase shadow ${
          tone === "after" ? "bg-clay-500" : "bg-ink-900/85"
        }`}
      >
        {label}
      </figcaption>
    </figure>
  );
}

/** Dashed line + arrow badge linking the two photos. */
function Connector() {
  return (
    <div className="relative flex w-14 items-center justify-center self-stretch sm:w-20" aria-hidden="true">
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-clay-400/70" />
      <svg viewBox="0 0 56 24" className="absolute top-[calc(50%-2.6rem)] left-1/2 w-full -translate-x-1/2 text-clay-400/70" fill="none">
        <path d="M2 20 C 14 2, 42 2, 54 20" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" strokeLinecap="round" />
      </svg>
      <span className="relative flex size-9 items-center justify-center rounded-full bg-clay-500 text-white shadow-lg ring-4 ring-white transition-transform group-hover:scale-110 sm:size-11">
        <Icon name="arrowRight" className="size-4 sm:size-5" />
      </span>
    </div>
  );
}
