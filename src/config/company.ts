/**
 * Public company details. Override with NEXT_PUBLIC_* environment variables
 * (see .env.example). The email and address fallbacks are placeholders.
 */
const env = (value: string | undefined, fallback: string) => value?.trim() || fallback;

/** Digits only, international format without "+", as wa.me requires. */
const whatsappDigits = env(process.env.NEXT_PUBLIC_COMPANY_WHATSAPP, "265993897567").replace(/\D/g, "");
const phone = env(process.env.NEXT_PUBLIC_COMPANY_PHONE, "+265 993 897 567");
const phone2 = env(process.env.NEXT_PUBLIC_COMPANY_PHONE_2, "+265 993 398 028");

const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export const company = {
  name: "Mozaik Pavers",
  legalName: env(process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME, "Mozaik Pavers"),
  tagline: "Quality paving, professionally finished.",
  phone,
  phoneHref: telHref(phone),
  /** All published numbers, main line first. */
  phones: [phone, phone2].map((number) => ({ number, href: telHref(number) })),
  whatsappDigits,
  email: env(process.env.NEXT_PUBLIC_COMPANY_EMAIL, "sales@mozaikpavers.com"),
  address: env(process.env.NEXT_PUBLIC_COMPANY_ADDRESS, "Lilongwe, Malawi"),
  hours: env(process.env.NEXT_PUBLIC_COMPANY_HOURS, "Mon–Fri 7:30–17:00 · Sat 8:00–12:00"),
  siteUrl: env(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000").replace(/\/$/, ""),
  serviceAreas: ["Lilongwe", "Blantyre", "Zomba", "Mzuzu", "Salima", "Mangochi"],
  /** Social media pages, shown in the footer and on the contact page. */
  social: [
    { name: "Facebook", icon: "facebook" as const, href: env(process.env.NEXT_PUBLIC_COMPANY_FACEBOOK, "https://www.facebook.com/mozaikpavers/") },
    { name: "Instagram", icon: "instagram" as const, href: env(process.env.NEXT_PUBLIC_COMPANY_INSTAGRAM, "https://www.instagram.com/mozaikpavers/") },
  ],
};

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${company.whatsappDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const PROJECT_TYPES = [
  "Driveway",
  "Walkway / Footpath",
  "Courtyard / Patio",
  "Parking Area",
  "Pool Surround",
  "Commercial Forecourt",
  "Road / Access Way",
  "Other",
] as const;

export const PAVER_STYLES = [
  "Not sure yet",
  "Interlocking",
  "Herringbone",
  "Running bond / Brick",
  "Basket-weave",
  "Hexagonal",
  "Cobble / Mosaic",
] as const;
