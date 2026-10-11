import type { PricingConfig, PricingKey } from "./types";

/**
 * Initial pricing supplied by Mozaik Pavers. Used only to seed the
 * database the first time; afterwards the database is the source of truth.
 */
export const DEFAULT_PRICING: PricingConfig = {
  paverPricePerSqm: 50_000,
  paverTransportCostPerTrip: 350_000,
  sqmPerPaverTrip: 100,
  fittingLabourPerSqm: 4_000,
  plasticPricePerRoll: 30_000,
  sqmPerPlasticRoll: 50,
  cuttingDiscPrice: 80_000,
  sqmPerCuttingDisc: 100,
  compactionPricePerDay: 450_000,
  sqmCompactedPerDay: 100,
  landscapingPricePerSqm: 850,
  dustPricePerTon: 28_000,
  sqmPerDustTon: 10,
  dustTransportCostPerTrip: 350_000,
  dustTruckCapacityTons: 15,
  quoteValidityDays: 7,
};

export type PricingFieldKind = "money" | "quantity" | "days";

export interface PricingFieldMeta {
  key: PricingKey;
  label: string;
  help: string;
  kind: PricingFieldKind;
  unit: string;
  group: string;
}

/** Labels and grouping for the admin Pricing Settings form. */
export const PRICING_FIELDS: PricingFieldMeta[] = [
  { key: "paverPricePerSqm", label: "Paver price", help: "Price of pavers per square metre", kind: "money", unit: "per SQM", group: "Pavers" },
  { key: "paverTransportCostPerTrip", label: "Paver transport cost", help: "Cost of one paver delivery trip", kind: "money", unit: "per trip", group: "Pavers" },
  { key: "sqmPerPaverTrip", label: "SQM per transport trip", help: "Area of pavers delivered per trip", kind: "quantity", unit: "SQM / trip", group: "Pavers" },
  { key: "fittingLabourPerSqm", label: "Fitting labour", help: "Labour charge per square metre", kind: "money", unit: "per SQM", group: "Labour & consumables" },
  { key: "plasticPricePerRoll", label: "Fitting plastic price", help: "Price of one roll of fitting plastic", kind: "money", unit: "per roll", group: "Labour & consumables" },
  { key: "sqmPerPlasticRoll", label: "Plastic coverage", help: "Area covered by one roll", kind: "quantity", unit: "SQM / roll", group: "Labour & consumables" },
  { key: "cuttingDiscPrice", label: "Cutting disc price", help: "Price of one cutting disc", kind: "money", unit: "per disc", group: "Labour & consumables" },
  { key: "sqmPerCuttingDisc", label: "Cutting disc coverage", help: "Area cut per disc", kind: "quantity", unit: "SQM / disc", group: "Labour & consumables" },
  { key: "compactionPricePerDay", label: "Compaction price", help: "Compactor hire and operation per day", kind: "money", unit: "per day", group: "Compaction" },
  { key: "sqmCompactedPerDay", label: "Compaction productivity", help: "Assumed SQM of paving compacted per day", kind: "quantity", unit: "SQM / day", group: "Compaction" },
  { key: "landscapingPricePerSqm", label: "Landscaping price", help: "Landscaping charge per square metre", kind: "money", unit: "per SQM", group: "Landscaping" },
  { key: "dustPricePerTon", label: "Fitting dust price", help: "Price of one ton of fitting dust", kind: "money", unit: "per ton", group: "Fitting dust" },
  { key: "sqmPerDustTon", label: "Dust coverage", help: "Area covered by one ton of dust", kind: "quantity", unit: "SQM / ton", group: "Fitting dust" },
  { key: "dustTransportCostPerTrip", label: "Dust transport cost", help: "Cost of one dust truck trip", kind: "money", unit: "per trip", group: "Fitting dust" },
  { key: "dustTruckCapacityTons", label: "Dust truck capacity", help: "Tons carried per truck trip", kind: "quantity", unit: "tons / trip", group: "Fitting dust" },
  { key: "quoteValidityDays", label: "Quotation validity", help: "Days an online estimate remains valid", kind: "days", unit: "days", group: "Quotation" },
];
