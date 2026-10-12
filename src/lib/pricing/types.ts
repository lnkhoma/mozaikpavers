/**
 * Pricing configuration model.
 *
 * Every monetary value is a whole number of Malawi Kwacha (MWK).
 * Every "per" / coverage value is the quantity one unit covers
 * (e.g. `sqmPerPlasticRoll = 50` means one roll covers 50 SQM).
 *
 * These values live in the database (pricing_config / pricing_history)
 * and are editable from Admin → Pricing Settings. Nothing in the UI
 * should hard-code them.
 */
export interface PricingConfig {
  paverPricePerSqm: number;
  paverTransportCostPerTrip: number;
  sqmPerPaverTrip: number;
  fittingLabourPerSqm: number;
  plasticPricePerRoll: number;
  sqmPerPlasticRoll: number;
  cuttingDiscPrice: number;
  sqmPerCuttingDisc: number;
  /** Compaction is charged as one day at this price, whatever the area. */
  compactionPricePerDay: number;
  landscapingPricePerSqm: number;
  dustPricePerTon: number;
  sqmPerDustTon: number;
  dustTransportCostPerTrip: number;
  dustTruckCapacityTons: number;
  /** How many days an online estimate remains valid. */
  quoteValidityDays: number;
}

export type PricingKey = keyof PricingConfig;

/** Additional services a customer can ask to be included. */
export const OPTIONAL_SERVICES = [
  "compaction",
  "landscaping",
  "sitePreparation",
  "removalOfExistingPaving",
  "drainage",
  "other",
] as const;
export type OptionalService = (typeof OPTIONAL_SERVICES)[number];

export interface QuotationOptions {
  includeCompaction: boolean;
  includeLandscaping: boolean;
  sitePreparation: boolean;
  removalOfExistingPaving: boolean;
  drainage: boolean;
  /** Free-text "other requirements"; non-empty means requested. */
  otherRequirements?: string;
}

export type LineCode =
  | "PAVERS"
  | "PAVER_TRANSPORT"
  | "FITTING_LABOUR"
  | "FITTING_PLASTIC"
  | "CUTTING_DISCS"
  | "COMPACTION"
  | "LANDSCAPING"
  | "FITTING_DUST"
  | "DUST_TRANSPORT"
  | "SITE_PREPARATION"
  | "REMOVAL_EXISTING_PAVING"
  | "DRAINAGE"
  | "OTHER_REQUIREMENTS";

export interface QuotationLine {
  code: LineCode;
  description: string;
  quantity: number | null;
  unit: string | null;
  /** null when the item is "subject to site assessment". */
  unitPrice: number | null;
  amount: number | null;
  note?: string;
}

export interface QuotationResult {
  squareMetres: number;

  paverQuantitySqm: number;
  paverCost: number;

  transportTrips: number;
  transportCost: number;

  fittingLabourCost: number;

  plasticRolls: number;
  plasticCost: number;

  cuttingDiscs: number;
  cuttingDiscCost: number;

  compactionIncluded: boolean;
  compactionDays: number;
  compactionCost: number;

  landscapingIncluded: boolean;
  landscapingCost: number;

  dustTons: number;
  dustCost: number;

  dustTransportTrips: number;
  dustTransportCost: number;

  /** Sum of every priced line. Items pending site assessment are excluded. */
  grandTotal: number;

  lines: QuotationLine[];
  /** True when at least one requested item has no price yet. */
  hasItemsSubjectToAssessment: boolean;
}
