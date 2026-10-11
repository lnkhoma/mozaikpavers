import { company, whatsappLink } from "@/config/company";
import { formatDate, formatKwacha, formatNumber } from "@/lib/format";
import { escapeHtml } from "./index";

interface QuotationEmailData {
  quoteNumber: string;
  customerName: string;
  squareMetres: number;
  grandTotal: number;
  validUntil: string;
  hasItemsSubjectToAssessment: boolean;
  downloadUrl: string;
  siteAssessmentUrl: string;
}

const button = (href: string, label: string, bg: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;margin:4px 6px 4px 0">${escapeHtml(label)}</a>`;

export function quotationEmail(d: QuotationEmailData) {
  const firstName = d.customerName.split(/\s+/)[0] ?? d.customerName;
  const subject = `Your Mozaik Pavers Quotation – ${d.quoteNumber}`;
  const wa = whatsappLink(`Hello Mozaik Pavers, I received quotation ${d.quoteNumber} and would like to discuss it.`);

  const html = `<!doctype html>
<html><body style="margin:0;background:#f3f3f2;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f2;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#ffffff;padding:22px 28px 14px;border-bottom:4px solid #d8780c">
    <img src="${escapeHtml(company.siteUrl)}/brand/logo.jpg" width="130" alt="Mozaik Pavers" style="display:block;border:0;height:auto;max-width:130px;font-size:20px;font-weight:800;color:#2b2b2b">
  </td></tr>
  <tr><td style="padding:28px">
    <p style="font-size:16px;margin:0 0 14px">Dear ${escapeHtml(firstName)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Thank you for considering Mozaik Pavers for your project. Your estimated quotation is attached as a PDF.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f2;border-radius:10px;margin:0 0 18px">
      <tr><td style="padding:18px 20px;font-size:14px;line-height:1.9">
        <strong>Quotation reference:</strong> ${escapeHtml(d.quoteNumber)}<br>
        <strong>Customer:</strong> ${escapeHtml(d.customerName)}<br>
        <strong>Project area:</strong> ${formatNumber(d.squareMetres)} SQM<br>
        <strong>Valid until:</strong> ${formatDate(d.validUntil)}<br>
        <span style="font-size:13px;color:#5c5c5c">Estimated project total</span><br>
        <span style="font-size:26px;font-weight:800;color:#b45f06">${formatKwacha(d.grandTotal)}</span>
        ${d.hasItemsSubjectToAssessment ? `<br><span style="font-size:12px;color:#5c5c5c">Some requested items are priced after a site assessment and are not included.</span>` : ""}
      </td></tr>
    </table>
    <p style="font-size:13px;line-height:1.6;color:#5c5c5c;margin:0 0 20px">This is an <strong>estimated quotation</strong> based on the measurements you provided and our standard assumptions. The final price is confirmed after a site assessment.</p>
    <p style="margin:0 0 8px">
      ${button(d.siteAssessmentUrl, "Request a Site Assessment", "#b45f06")}
      ${button(wa, "Chat on WhatsApp", "#1f7a4d")}
    </p>
    <p style="font-size:13px;margin:16px 0 0">Can't open the attachment? <a href="${escapeHtml(d.downloadUrl)}" style="color:#b45f06">Download your quotation</a>.</p>
  </td></tr>
  <tr><td style="background:#fafafa;padding:18px 28px;font-size:12px;color:#5c5c5c;line-height:1.7">
    ${escapeHtml(company.name)} · ${escapeHtml(company.address)}<br>
    Call ${company.phones.map((p) => `<a href="${escapeHtml(p.href)}" style="color:#2b2b2b">${escapeHtml(p.number)}</a>`).join(" / ")} · <a href="mailto:${escapeHtml(company.email)}" style="color:#2b2b2b">${escapeHtml(company.email)}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Dear ${firstName},`,
    "",
    "Thank you for considering Mozaik Pavers. Your estimated quotation is attached.",
    "",
    `Quotation reference: ${d.quoteNumber}`,
    `Customer: ${d.customerName}`,
    `Project area: ${formatNumber(d.squareMetres)} SQM`,
    `Estimated total: ${formatKwacha(d.grandTotal)}`,
    `Valid until: ${formatDate(d.validUntil)}`,
    "",
    "This is an estimated quotation; the final price is confirmed after a site assessment.",
    "",
    `Request a site assessment: ${d.siteAssessmentUrl}`,
    `WhatsApp: ${wa}`,
    `Call: ${company.phones.map((p) => p.number).join(" / ")}`,
    `Download your quotation: ${d.downloadUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function newLeadNotificationEmail(d: {
  kind: string;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  location?: string | null;
  squareMetres?: number | null;
  estimatedValue?: number | null;
  message?: string | null;
  adminUrl: string;
}) {
  const subject = `New ${d.kind}: ${d.customerName}${d.estimatedValue ? ` – ${formatKwacha(d.estimatedValue)}` : ""}`;
  const rows: [string, string][] = [
    ["Reference", d.reference],
    ["Customer", d.customerName],
    ["Email", d.email],
    ["Phone", d.phone],
  ];
  if (d.location) rows.push(["Location", d.location]);
  if (d.squareMetres) rows.push(["Area", `${formatNumber(d.squareMetres)} SQM`]);
  if (d.estimatedValue) rows.push(["Estimated value", formatKwacha(d.estimatedValue)]);
  if (d.message) rows.push(["Message", d.message]);
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2b2b2b">
<h2 style="margin:0 0 12px">New ${escapeHtml(d.kind)}</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#5c5c5c">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`)
    .join("")}</table>
<p><a href="${escapeHtml(d.adminUrl)}">Open in the Mozaik Pavers dashboard</a></p></div>`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${d.adminUrl}`;
  return { subject, html, text };
}
