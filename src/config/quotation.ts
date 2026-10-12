import { company } from "./company";

/**
 * Content of the PDF quotation, modelled on Mozaik Works' own quote
 * template (QT-000482). Edit here to change what every new quotation shows.
 */
export const QUOTATION = {
  issuer: {
    name: "Mozaik Works",
    addressLines: ["C/o Exponential Marketing", "P. O Box 11031", "Lilongwe", "Malawi"],
    phones: company.phones.map((p) => p.number.replace(/^\+265\s?/, "0").replace(/\s/g, "")),
    email: process.env.QUOTATION_EMAIL?.trim() || "sales@mozaikpavers.com",
  },

  /** Work not covered by the online estimate. */
  customerProvides: [
    "Cost for site preparation (clearing, levelling, removal of existing paving) and any drainage work, unless priced above. These are assessed and quoted after a site visit.",
  ],

  paymentTerms: ["70% upfront", "15% material on site", "15% midway fitting"],

  paymentNote: "All payments to be made only through the listed bank account details. If cash is paid, please get an electronic receipt for it.",

  /**
   * Printed under the payment note. Real bank details are deliberately not
   * shown on self-generated quotations; they are given to the customer directly.
   */
  bankDetailsPlaceholder: "XXXX XXXX XXX",

  /** Shown after "This quotation is valid for N days from the day of issue." */
  closingTerms: [
    "Mozaik retains the right to adjust cost to reflect changes in pricing of materials.",
    "A final quotation will be issued after a site assessment by Mozaik Pavers.",
  ],
};
