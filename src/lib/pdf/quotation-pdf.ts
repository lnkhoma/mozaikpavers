import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { QUOTATION } from "@/config/quotation";
import { formatDate, formatNumber } from "@/lib/format";
import { SUBJECT_TO_ASSESSMENT } from "@/lib/pricing/engine";
import type { LineCode, PricingConfig, QuotationResult } from "@/lib/pricing/types";

export interface QuotationPdfData {
  quoteNumber: string;
  issuedAt: Date;
  validUntil: string;
  pricingVersion: number;
  /** Rates used, to explain how each quantity was derived. */
  pricing?: PricingConfig;
  customer: { fullName: string; email: string; phone: string; whatsapp?: string | null };
  project: {
    location: string;
    projectType?: string | null;
    paverStyle?: string | null;
    expectedStartDate?: string | null;
    notes?: string | null;
  };
  result: QuotationResult;
}

export const QUOTATION_DISCLAIMER =
  "This is an ESTIMATED QUOTATION generated online from customer-provided measurements and standard assumptions. It is not a final " +
  "contractual offer. The final quotation may change following a physical site assessment, confirmed measurements, ground and site " +
  "conditions, material selection, transportation distance, drainage requirements, site preparation requirements and other " +
  "project-specific requirements.";

/*
 * Layout modelled on Mozaik Works' quote template: logo top-left, "QUOTE"
 * and number top-right, issuer block, customer and dates, a dark-headed
 * item table, sub total and a shaded total row, then terms and bank details.
 */
const INK = rgb(0.2, 0.2, 0.2);
const MUTED = rgb(0.45, 0.45, 0.45);
const HEADER_BG = rgb(0.235, 0.235, 0.235);
const RULE = rgb(0.78, 0.78, 0.78);
const TOTAL_BG = rgb(0.953, 0.949, 0.945);
const ACCENT = rgb(216 / 255, 120 / 255, 12 / 255); // logo orange #D8780C
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const M = 46; // page margin
const FOOTER_Y = 30;

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Grey second line under each item, explaining the quantity. */
function itemNote(code: LineCode, p: PricingConfig | undefined, paverStyle?: string | null): string | undefined {
  switch (code) {
    case "PAVERS":
      return paverStyle && paverStyle !== "Not sure yet" ? paverStyle : "Concrete paving blocks";
    case "PAVER_TRANSPORT":
      return p && `1 trip per ${formatNumber(p.sqmPerPaverTrip)} SQM or part thereof`;
    case "FITTING_LABOUR":
      return "Laying and fitting of pavers";
    case "FITTING_PLASTIC":
      return p && `1 roll covers ${formatNumber(p.sqmPerPlasticRoll)} SQM`;
    case "CUTTING_DISCS":
      return p && `1 disc per ${formatNumber(p.sqmPerCuttingDisc)} SQM`;
    case "COMPACTION":
      return p && `Based on ${formatNumber(p.sqmCompactedPerDay)} SQM per day`;
    case "LANDSCAPING":
      return "Finishing around the paved area";
    case "FITTING_DUST":
      return p && `1 ton covers ${formatNumber(p.sqmPerDustTon)} SQM`;
    case "DUST_TRANSPORT":
      return p && `Up to ${formatNumber(p.dustTruckCapacityTons)} tons per trip`;
    default:
      return SUBJECT_TO_ASSESSMENT;
  }
}

/** pdf-lib's standard fonts are WinAnsi; replace anything they cannot draw. */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      const stripped = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
      try {
        font.encodeText(stripped);
        out += stripped;
      } catch {
        out += "?";
      }
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of safe(font, text).split(/\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** Company logo from public/brand/logo.jpg (or logo.png). */
async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  const dir = path.join(process.cwd(), "public", "brand");
  try {
    return await doc.embedJpg(await readFile(path.join(dir, "logo.jpg")));
  } catch {
    try {
      return await doc.embedPng(await readFile(path.join(dir, "logo.png")));
    } catch {
      return null;
    }
  }
}

export async function buildQuotationPdf(data: QuotationPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Quote ${data.quoteNumber}`);
  doc.setAuthor(QUOTATION.issuer.name);
  doc.setSubject("Estimated paving quotation");
  doc.setCreator(QUOTATION.issuer.name);
  doc.setCreationDate(data.issuedAt);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(doc);

  const [W, H] = A4;
  const right = W - M;
  const contentWidth = W - M * 2;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  type Opts = { font?: PDFFont; size?: number; color?: RGB };
  const text = (t: string, x: number, yy: number, o: Opts = {}) => {
    const font = o.font ?? regular;
    page.drawText(safe(font, t), { x, y: yy, font, size: o.size ?? 9.5, color: o.color ?? INK });
  };
  const rightText = (t: string, xRight: number, yy: number, o: Opts = {}) => {
    const font = o.font ?? regular;
    const size = o.size ?? 9.5;
    const s = safe(font, t);
    page.drawText(s, { x: xRight - font.widthOfTextAtSize(s, size), y: yy, font, size, color: o.color ?? INK });
  };
  const rule = (yy: number) => page.drawLine({ start: { x: M, y: yy }, end: { x: right, y: yy }, thickness: 0.6, color: RULE });

  const newPage = () => {
    page = doc.addPage(A4);
    pages.push(page);
    y = H - M;
  };
  const ensure = (space: number, onBreak?: () => void) => {
    if (y - space < FOOTER_Y + 30) {
      newPage();
      onBreak?.();
    }
  };

  /* ---------------- Header: logo · QUOTE ---------------- */
  newPage();
  const logoTop = H - 40;
  let headerBottom = logoTop - 70;
  if (logo) {
    const w = 150;
    const h = (logo.height / logo.width) * w;
    page.drawImage(logo, { x: M - 6, y: logoTop - h, width: w, height: h });
    headerBottom = logoTop - h;
  } else {
    text("MOZAIK", M, logoTop - 30, { font: bold, size: 24, color: MUTED });
    text("Pavers", M + bold.widthOfTextAtSize("MOZAIK", 24) + 2, logoTop - 30, { font: bold, size: 24, color: ACCENT });
  }
  rightText("QUOTE", right, logoTop - 34, { size: 30 });
  rightText(`# ${data.quoteNumber}`, right, logoTop - 50, { font: bold, size: 9.5 });
  rightText("Estimated quotation - subject to site assessment", right, logoTop - 63, { size: 7.5, color: MUTED });

  /* ---------------- Issuer block ---------------- */
  y = headerBottom - 18;
  text(QUOTATION.issuer.name, M, y, { font: bold, size: 10 });
  for (const line of [...QUOTATION.issuer.addressLines, QUOTATION.issuer.phones.join(" / "), QUOTATION.issuer.email]) {
    y -= 12.5;
    text(line, M, y);
  }

  /* ---------------- Customer · dates ---------------- */
  y -= 34;
  const blockTop = y;
  text(data.customer.fullName, M, y, { font: bold, size: 10 });
  const customerLines = [
    data.customer.phone + (data.customer.whatsapp && data.customer.whatsapp !== data.customer.phone ? ` (WhatsApp ${data.customer.whatsapp})` : ""),
    data.customer.email,
    `Project location: ${data.project.location}`,
    data.project.projectType ? `Project type: ${data.project.projectType}` : null,
  ].filter((l): l is string => !!l);
  for (const line of customerLines) {
    y -= 12.5;
    text(line, M, y, { size: 9, color: MUTED });
  }

  const dates: [string, string][] = [
    ["Quote Date", formatDate(data.issuedAt)],
    ["Valid Until", formatDate(data.validUntil)],
    ["Area", `${formatNumber(data.result.squareMetres)} SQM`],
  ];
  if (data.project.expectedStartDate) dates.push(["Expected Start", formatDate(data.project.expectedStartDate)]);
  dates.forEach(([label, value], i) => {
    const yy = blockTop - i * 15;
    rightText(label, right - 120, yy, { color: MUTED });
    text(":", right - 112, yy, { color: MUTED });
    rightText(value, right, yy);
  });
  y = Math.min(y, blockTop - (dates.length - 1) * 15) - 26;

  /* ---------------- Item table ---------------- */
  const col = { num: M + 16, desc: M + 44, qty: M + 330, rate: M + 410, amount: right - 10 };
  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 9, width: contentWidth, height: 26, color: HEADER_BG });
    text("#", col.num, y, { color: WHITE });
    text("Description", col.desc, y, { color: WHITE });
    rightText("Qty", col.qty, y, { color: WHITE });
    rightText("Rate", col.rate, y, { color: WHITE });
    rightText("Amount", col.amount, y, { color: WHITE });
    y -= 30;
  };
  tableHeader();

  data.result.lines.forEach((line, i) => {
    const note = itemNote(line.code, data.pricing, data.project.paverStyle);
    const rowH = 32;
    ensure(rowH, tableHeader);
    const top = y;
    text(String(i + 1), col.num, top);
    text(line.description, col.desc, top);
    if (note) text(note, col.desc, top - 12, { size: 8.5, color: line.amount === null ? ACCENT : MUTED });
    if (line.amount === null) {
      rightText("-", col.amount, top, { color: MUTED });
    } else {
      rightText(money(line.quantity ?? 0), col.qty, top);
      rightText(line.unit ?? "", col.qty, top - 12, { size: 8.5, color: MUTED });
      rightText(money(line.unitPrice ?? 0), col.rate, top);
      rightText(money(line.amount), col.amount, top);
    }
    y -= rowH;
    rule(y + 10);
  });

  /* ---------------- Totals ---------------- */
  ensure(70);
  y -= 8;
  rightText("Sub Total", col.rate - 10, y);
  rightText(money(data.result.grandTotal), col.amount, y);
  y -= 18;
  const bandX = M + contentWidth * 0.5;
  page.drawRectangle({ x: bandX, y: y - 15, width: right - bandX, height: 32, color: TOTAL_BG });
  rightText("Total", col.rate - 10, y - 3, { font: bold, size: 10 });
  rightText(`MWK${money(data.result.grandTotal)}`, col.amount, y - 3, { font: bold, size: 10 });
  y -= 22;
  if (data.result.hasItemsSubjectToAssessment) {
    y -= 10;
    rightText('Items marked "Price subject to site assessment" are not included in the total.', right, y, { size: 7.5, color: MUTED });
  }

  /* ---------------- Notes & terms ---------------- */
  const S = 8.5;
  const LH = 11.5;
  const para = (t: string, o: Opts & { gap?: number } = {}) => {
    const lines = wrap(o.font ?? regular, t, o.size ?? S, contentWidth);
    ensure(lines.length * LH + 2);
    for (const l of lines) {
      text(l, M, y, { size: o.size ?? S, font: o.font, color: o.color });
      y -= LH;
    }
    y -= o.gap ?? 6;
  };

  y -= 30;
  // Keep the disclaimer heading on the same page as its paragraph.
  ensure(LH * (wrap(regular, QUOTATION_DISCLAIMER, S, contentWidth).length + 1) + 4);
  para("IMPORTANT - ESTIMATED QUOTATION", { font: bold, color: ACCENT, gap: 2 });
  para(QUOTATION_DISCLAIMER, { gap: 14 });

  let n = 1;
  para("Customer is required to provide the following", { gap: 8 });
  for (const item of QUOTATION.customerProvides) para(`${n++}. ${item}`, { gap: 8 });
  para(`${n++}. Payment Terms`, { gap: 4 });
  for (const t of QUOTATION.paymentTerms) para(t, { gap: 0 });
  y -= 8;
  para(`${n++}. ${QUOTATION.paymentNote}`, { gap: 10 });

  for (const acc of QUOTATION.bankAccounts) {
    const lines = [
      `Account Name: ${acc.accountName}`,
      `Account No: ${acc.accountNumber}`,
      "accountType" in acc && acc.accountType ? `Type of account: ${acc.accountType}` : null,
      `Bank: ${acc.bank}${"branch" in acc && acc.branch ? `, ${acc.branch}` : ""}`,
    ].filter((l): l is string => !!l);
    ensure(lines.length * 12 + 8);
    for (const l of lines) {
      text(l, M, y);
      y -= 12;
    }
    y -= 8;
  }

  y -= 8;
  // Validity comes from the pricing snapshot; older data falls back to the dates.
  const issuedIso = new Date(data.issuedAt.getTime() + 2 * 3600_000).toISOString().slice(0, 10); // Malawi date
  const validityDays =
    data.pricing?.quoteValidityDays ??
    Math.round((Date.parse(`${data.validUntil}T00:00:00Z`) - Date.parse(`${issuedIso}T00:00:00Z`)) / 86_400_000);
  const closing = [
    `This quotation is valid for ${validityDays > 0 ? `${validityDays} days` : "a limited period"} from the day of issue.`,
    ...QUOTATION.closingTerms,
  ];
  closing.forEach((t, i) => para(`${i + 1}. ${t}`, { gap: 8 }));

  if (data.project.notes) {
    y -= 6;
    para("Customer notes", { font: bold, gap: 2 });
    para(data.project.notes.slice(0, 800), { color: MUTED });
  }

  /* ---------------- Footer on every page ---------------- */
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: FOOTER_Y + 14 }, end: { x: right, y: FOOTER_Y + 14 }, thickness: 0.6, color: RULE });
    const left = safe(regular, `${QUOTATION.issuer.name} · Quote ${data.quoteNumber} · Pricing v${data.pricingVersion}`);
    p.drawText(left, { x: M, y: FOOTER_Y, size: 7.5, font: regular, color: MUTED });
    const label = String(i + 1);
    p.drawText(label, { x: right - regular.widthOfTextAtSize(label, 7.5), y: FOOTER_Y, size: 7.5, font: regular, color: MUTED });
  });

  return doc.save();
}
