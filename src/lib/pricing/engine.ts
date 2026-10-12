import type {
  PricingConfig,
  QuotationLine,
  QuotationOptions,
  QuotationResult,
} from "./types";

/** Valid range for the customer-entered area. */
export const MIN_AREA_SQM = 1;
export const MAX_AREA_SQM = 100_000;

export const DEFAULT_OPTIONS: QuotationOptions = {
  includeCompaction: true,
  includeLandscaping: true,
  sitePreparation: false,
  removalOfExistingPaving: false,
  drainage: false,
  otherRequirements: "",
};

export const SUBJECT_TO_ASSESSMENT = "Price subject to site assessment";

export class QuotationInputError extends Error {}

/**
 * "For every N or part thereof": ceil(quantity / perUnit).
 *
 * Areas are limited to two decimal places, so we work in hundredths to avoid
 * floating-point artefacts such as 100.00000000001 / 100 rounding up to 2.
 */
export function unitsRequired(quantity: number, coveragePerUnit: number): number {
  if (quantity <= 0) return 0;
  const q = Math.round(quantity * 100);
  const c = Math.round(coveragePerUnit * 100);
  return Math.ceil(q / c);
}

/** Money is held as whole Kwacha. */
function kwacha(value: number): number {
  return Math.round(value);
}

export function normaliseArea(squareMetres: number): number {
  if (!Number.isFinite(squareMetres)) {
    throw new QuotationInputError("Area must be a number.");
  }
  const area = Math.round(squareMetres * 100) / 100;
  if (area < MIN_AREA_SQM || area > MAX_AREA_SQM) {
    throw new QuotationInputError(
      `Area must be between ${MIN_AREA_SQM} and ${MAX_AREA_SQM.toLocaleString("en-US")} SQM.`,
    );
  }
  return area;
}

export function assertValidPricing(config: PricingConfig): void {
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new QuotationInputError(`Pricing value "${key}" is invalid.`);
    }
  }
  const coverages: (keyof PricingConfig)[] = [
    "sqmPerPaverTrip",
    "sqmPerPlasticRoll",
    "sqmPerCuttingDisc",
    "sqmPerDustTon",
    "dustTruckCapacityTons",
  ];
  for (const key of coverages) {
    if (config[key] <= 0) {
      throw new QuotationInputError(`Pricing value "${key}" must be greater than zero.`);
    }
  }
}

/**
 * The single source of truth for quotation maths.
 *
 * Pure and deterministic: the browser uses it for the live estimate and the
 * server re-runs it (with the pricing loaded from the database) before saving
 * or emailing anything. Totals sent from the browser are never trusted.
 */
export function calculateQuotation(
  squareMetres: number,
  config: PricingConfig,
  options: Partial<QuotationOptions> = {},
): QuotationResult {
  assertValidPricing(config);
  const area = normaliseArea(squareMetres);
  const opts: QuotationOptions = { ...DEFAULT_OPTIONS, ...options };

  const paverCost = kwacha(area * config.paverPricePerSqm);

  const transportTrips = unitsRequired(area, config.sqmPerPaverTrip);
  const transportCost = transportTrips * config.paverTransportCostPerTrip;

  const fittingLabourCost = kwacha(area * config.fittingLabourPerSqm);

  const plasticRolls = unitsRequired(area, config.sqmPerPlasticRoll);
  const plasticCost = plasticRolls * config.plasticPricePerRoll;

  const cuttingDiscs = unitsRequired(area, config.sqmPerCuttingDisc);
  const cuttingDiscCost = cuttingDiscs * config.cuttingDiscPrice;

  const compactionIncluded = opts.includeCompaction;
  // Compaction is a fixed one-day charge: it does not grow with the area.
  const compactionDays = compactionIncluded ? 1 : 0;
  const compactionCost = compactionDays * config.compactionPricePerDay;

  const landscapingIncluded = opts.includeLandscaping;
  const landscapingCost = landscapingIncluded
    ? kwacha(area * config.landscapingPricePerSqm)
    : 0;

  // Dust is procured in whole tons: round up.
  const dustTons = unitsRequired(area, config.sqmPerDustTon);
  const dustCost = dustTons * config.dustPricePerTon;

  const dustTransportTrips = unitsRequired(dustTons, config.dustTruckCapacityTons);
  const dustTransportCost = dustTransportTrips * config.dustTransportCostPerTrip;

  const lines: QuotationLine[] = [
    line("PAVERS", "Pavers", area, "SQM", config.paverPricePerSqm, paverCost),
    line("PAVER_TRANSPORT", "Paver Transportation", transportTrips, plural(transportTrips, "trip"), config.paverTransportCostPerTrip, transportCost),
    line("FITTING_LABOUR", "Fitting Labour", area, "SQM", config.fittingLabourPerSqm, fittingLabourCost),
    line("FITTING_PLASTIC", "Fitting Plastic", plasticRolls, plural(plasticRolls, "roll"), config.plasticPricePerRoll, plasticCost),
    line("CUTTING_DISCS", "Cutting Discs", cuttingDiscs, plural(cuttingDiscs, "disc"), config.cuttingDiscPrice, cuttingDiscCost),
  ];
  if (compactionIncluded) {
    lines.push(line("COMPACTION", "Compaction", compactionDays, plural(compactionDays, "day"), config.compactionPricePerDay, compactionCost));
  }
  if (landscapingIncluded) {
    lines.push(line("LANDSCAPING", "Landscaping", area, "SQM", config.landscapingPricePerSqm, landscapingCost));
  }
  lines.push(
    line("FITTING_DUST", "Fitting Dust", dustTons, plural(dustTons, "ton"), config.dustPricePerTon, dustCost),
    line("DUST_TRANSPORT", "Dust Transportation", dustTransportTrips, plural(dustTransportTrips, "trip"), config.dustTransportCostPerTrip, dustTransportCost),
  );

  // Requested services with no pricing rule: never invent a price.
  const unpriced: [boolean, QuotationLine["code"], string][] = [
    [opts.sitePreparation, "SITE_PREPARATION", "Site Preparation"],
    [opts.removalOfExistingPaving, "REMOVAL_EXISTING_PAVING", "Removal of Existing Paving"],
    [opts.drainage, "DRAINAGE", "Drainage Work"],
    [Boolean(opts.otherRequirements?.trim()), "OTHER_REQUIREMENTS", "Other Requirements"],
  ];
  for (const [requested, code, description] of unpriced) {
    if (requested) {
      lines.push({
        code,
        description,
        quantity: null,
        unit: null,
        unitPrice: null,
        amount: null,
        note: SUBJECT_TO_ASSESSMENT,
      });
    }
  }

  const grandTotal = lines.reduce((sum, l) => sum + (l.amount ?? 0), 0);

  return {
    squareMetres: area,
    paverQuantitySqm: area,
    paverCost,
    transportTrips,
    transportCost,
    fittingLabourCost,
    plasticRolls,
    plasticCost,
    cuttingDiscs,
    cuttingDiscCost,
    compactionIncluded,
    compactionDays,
    compactionCost,
    landscapingIncluded,
    landscapingCost,
    dustTons,
    dustCost,
    dustTransportTrips,
    dustTransportCost,
    grandTotal,
    lines,
    hasItemsSubjectToAssessment: lines.some((l) => l.amount === null),
  };
}

function line(
  code: QuotationLine["code"],
  description: string,
  quantity: number,
  unit: string,
  unitPrice: number,
  amount: number,
): QuotationLine {
  return { code, description, quantity, unit, unitPrice, amount };
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}
