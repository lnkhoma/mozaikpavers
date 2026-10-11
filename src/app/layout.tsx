import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { NumberInputGuard } from "@/components/ui/number-input-guard";
import { company } from "@/config/company";
import "./globals.css";

const body = Manrope({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: {
    default: "Mozaik Pavers — Quality Paving in Malawi | Instant Quotations",
    template: "%s | Mozaik Pavers",
  },
  description:
    "Mozaik Pavers designs and installs durable, beautifully finished paving for driveways, courtyards, walkways and parking areas across Malawi. Get an instant quotation online.",
  openGraph: {
    type: "website",
    siteName: company.name,
    locale: "en_MW",
    images: [{ url: "/portfolio/double-storey-residence-forecourt/img_4053.jpg", width: 480, height: 640 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2b2b2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        {children}
        <NumberInputGuard />
      </body>
    </html>
  );
}
