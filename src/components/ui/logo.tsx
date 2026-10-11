import Image from "next/image";

/**
 * Official Mozaik Pavers logo (public/brand/logo.png, transparent).
 * Size it with a height class; the width follows the logo's proportions.
 * `tone` is kept for call sites on dark backgrounds, where the logo sits on
 * a subtle light plate so its grey pavers stay crisp.
 */
export function Logo({
  tone = "dark",
  className = "h-12",
  priority = false,
}: {
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  const img = (
    <Image
      src="/brand/logo.png"
      alt="Mozaik Pavers"
      width={653}
      height={406}
      priority={priority}
      sizes="160px"
      className={`w-auto ${className}`}
    />
  );
  return tone === "light" ? <span className="inline-flex rounded-xl bg-white/95 px-2.5 py-1.5 shadow-sm">{img}</span> : img;
}
