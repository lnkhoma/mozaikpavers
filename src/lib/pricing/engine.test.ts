import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING } from "./defaults";
import {
  calculateQuotation,
  QuotationInputError,
  SUBJECT_TO_ASSESSMENT,
  unitsRequired,
} from "./engine";

describe("calculateQuotation — reference example (150 SQM)", () => {
  const q = calculateQuotation(150, DEFAULT_PRICING);

  it("matches every line of the specification table", () => {
    const table = q.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.amount]);
    expect(table).toEqual([
      ["Pavers", 150, 50_000, 7_500_000],
      ["Paver Transportation", 2, 350_000, 700_000],
      ["Fitting Labour", 150, 4_000, 600_000],
      ["Fitting Plastic", 3, 30_000, 90_000],
      ["Cutting Discs", 2, 80_000, 160_000],
      ["Compaction", 2, 450_000, 900_000],
      ["Landscaping", 150, 850, 127_500],
      ["Fitting Dust", 15, 28_000, 420_000],
      ["Dust Transportation", 1, 350_000, 350_000],
    ]);
  });

  it("totals K10,847,500", () => {
    expect(q.grandTotal).toBe(10_847_500);
  });

  it("exposes the structured fields", () => {
    expect(q).toMatchObject({
      squareMetres: 150,
      paverQuantitySqm: 150,
      paverCost: 7_500_000,
      transportTrips: 2,
      transportCost: 700_000,
      fittingLabourCost: 600_000,
      plasticRolls: 3,
      plasticCost: 90_000,
      cuttingDiscs: 2,
      cuttingDiscCost: 160_000,
      compactionDays: 2,
      compactionCost: 900_000,
      landscapingCost: 127_500,
      dustTons: 15,
      dustCost: 420_000,
      dustTransportTrips: 1,
      dustTransportCost: 350_000,
      grandTotal: 10_847_500,
    });
  });
});

/**
 * Quantities and totals below are worked out by hand from the pricing rules,
 * not derived from the engine, so they independently check every threshold.
 */
describe("calculateQuotation — threshold boundaries", () => {
  const cases: {
    area: number;
    trips: number;
    rolls: number;
    discs: number;
    days: number;
    dustTons: number;
    dustTrips: number;
    total: number;
  }[] = [
    { area: 49, trips: 1, rolls: 1, discs: 1, days: 1, dustTons: 5, dustTrips: 1, total: 4_087_650 },
    { area: 50, trips: 1, rolls: 1, discs: 1, days: 1, dustTons: 5, dustTrips: 1, total: 4_142_500 },
    { area: 51, trips: 1, rolls: 2, discs: 1, days: 1, dustTons: 6, dustTrips: 1, total: 4_255_350 },
    { area: 99, trips: 1, rolls: 2, discs: 1, days: 1, dustTons: 10, dustTrips: 1, total: 7_000_150 },
    { area: 100, trips: 1, rolls: 2, discs: 1, days: 1, dustTons: 10, dustTrips: 1, total: 7_055_000 },
    { area: 101, trips: 2, rolls: 3, discs: 2, days: 2, dustTons: 11, dustTrips: 1, total: 8_047_850 },
    { area: 149, trips: 2, rolls: 3, discs: 2, days: 2, dustTons: 15, dustTrips: 1, total: 10_792_650 },
    { area: 150, trips: 2, rolls: 3, discs: 2, days: 2, dustTons: 15, dustTrips: 1, total: 10_847_500 },
    { area: 151, trips: 2, rolls: 4, discs: 2, days: 2, dustTons: 16, dustTrips: 2, total: 11_310_350 },
    { area: 199, trips: 2, rolls: 4, discs: 2, days: 2, dustTons: 20, dustTrips: 2, total: 14_055_150 },
    { area: 200, trips: 2, rolls: 4, discs: 2, days: 2, dustTons: 20, dustTrips: 2, total: 14_110_000 },
    { area: 201, trips: 3, rolls: 5, discs: 3, days: 3, dustTons: 21, dustTrips: 2, total: 15_102_850 },
  ];

  it.each(cases)("$area SQM", (c) => {
    const q = calculateQuotation(c.area, DEFAULT_PRICING);
    expect(q.transportTrips).toBe(c.trips);
    expect(q.plasticRolls).toBe(c.rolls);
    expect(q.cuttingDiscs).toBe(c.discs);
    expect(q.compactionDays).toBe(c.days);
    expect(q.dustTons).toBe(c.dustTons);
    expect(q.dustTransportTrips).toBe(c.dustTrips);
    expect(q.grandTotal).toBe(c.total);
  });

  it("the grand total always equals the sum of the line amounts", () => {
    for (const c of cases) {
      const q = calculateQuotation(c.area, DEFAULT_PRICING);
      const sum = q.lines.reduce((s, l) => s + (l.amount ?? 0), 0);
      expect(q.grandTotal).toBe(sum);
    }
  });
});

describe("calculateQuotation — options", () => {
  it("includes landscaping by default and drops it when deselected", () => {
    const withL = calculateQuotation(150, DEFAULT_PRICING);
    const withoutL = calculateQuotation(150, DEFAULT_PRICING, { includeLandscaping: false });
    expect(withL.lines.some((l) => l.code === "LANDSCAPING")).toBe(true);
    expect(withoutL.lines.some((l) => l.code === "LANDSCAPING")).toBe(false);
    expect(withoutL.landscapingCost).toBe(0);
    expect(withL.grandTotal - withoutL.grandTotal).toBe(127_500);
  });

  it("lists unpriced services as subject to site assessment without inventing a price", () => {
    const q = calculateQuotation(150, DEFAULT_PRICING, {
      sitePreparation: true,
      removalOfExistingPaving: true,
      drainage: true,
      otherRequirements: "Steps at entrance",
    });
    const pending = q.lines.filter((l) => l.amount === null);
    expect(pending.map((l) => l.code)).toEqual([
      "SITE_PREPARATION",
      "REMOVAL_EXISTING_PAVING",
      "DRAINAGE",
      "OTHER_REQUIREMENTS",
    ]);
    for (const l of pending) {
      expect(l.unitPrice).toBeNull();
      expect(l.note).toBe(SUBJECT_TO_ASSESSMENT);
    }
    expect(q.hasItemsSubjectToAssessment).toBe(true);
    expect(q.grandTotal).toBe(10_847_500);
  });

  it("ignores blank 'other requirements'", () => {
    const q = calculateQuotation(150, DEFAULT_PRICING, { otherRequirements: "   " });
    expect(q.hasItemsSubjectToAssessment).toBe(false);
  });
});

describe("calculateQuotation — configurable pricing", () => {
  it("uses the compaction productivity assumption from configuration", () => {
    const q = calculateQuotation(150, { ...DEFAULT_PRICING, sqmCompactedPerDay: 50 });
    expect(q.compactionDays).toBe(3);
    expect(q.compactionCost).toBe(1_350_000);
  });

  it("reflects an updated paver price", () => {
    const q = calculateQuotation(10, { ...DEFAULT_PRICING, paverPricePerSqm: 55_000 });
    expect(q.paverCost).toBe(550_000);
  });

  it("rejects zero coverage values", () => {
    expect(() => calculateQuotation(10, { ...DEFAULT_PRICING, sqmPerDustTon: 0 })).toThrow(
      QuotationInputError,
    );
  });
});

describe("calculateQuotation — input handling", () => {
  it.each([0, -5, 0.5, 100_001, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an area of %s",
    (area) => {
      expect(() => calculateQuotation(area, DEFAULT_PRICING)).toThrow(QuotationInputError);
    },
  );

  it("handles fractional areas and rounds money to whole Kwacha", () => {
    const q = calculateQuotation(100.01, DEFAULT_PRICING);
    expect(q.transportTrips).toBe(2);
    expect(q.landscapingCost).toBe(85_009); // 100.01 × 850 = 85,008.5 → 85,009
    expect(Number.isInteger(q.grandTotal)).toBe(true);
  });

  it("does not round up on floating-point noise", () => {
    expect(unitsRequired(100, 100)).toBe(1);
    expect(unitsRequired(0.1 + 0.2, 0.3)).toBe(1);
    expect(unitsRequired(300.0000000001, 100)).toBe(3);
  });
});
