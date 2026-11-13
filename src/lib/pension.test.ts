import { describe, expect, it } from "vitest";
import {
  dpsStateContribution,
  drawdownMonthly,
  firstBandRate,
  normalisePension,
  pensionDefaults,
  pensionFromParams,
  pensionToParams,
  potOpenMonths,
  projectPot,
  resolvePlanPension,
  resolveGross,
  retirementSummary,
  statePension,
  statutoryAgeMonths,
  taxSaving,
  yearRate,
} from "./pension";

describe("statutoryAgeMonths", () => {
  it("1961 woman, 5 children → 59y 8m", () => expect(statutoryAgeMonths(1961, true, 5)).toBe(59 * 12 + 8));
  it("1961 woman, 1 child → 64y 2m", () => expect(statutoryAgeMonths(1961, true, 1)).toBe(64 * 12 + 2));
  it("1966 woman, 3 children → 63y 8m", () => expect(statutoryAgeMonths(1966, true, 3)).toBe(63 * 12 + 8));
  it("1972 man → 65y 7m", () => expect(statutoryAgeMonths(1972, false, 0)).toBe(65 * 12 + 7));
  it("1972 woman, 5 children → 65y 2m", () => expect(statutoryAgeMonths(1972, true, 5)).toBe(65 * 12 + 2));
  it("1973 anyone → 65y 8m", () => expect(statutoryAgeMonths(1973, true, 4)).toBe(65 * 12 + 8));
  it("1977 → 66y 0m", () => expect(statutoryAgeMonths(1977, false, 0)).toBe(66 * 12));
  it("1988 → 66y 11m", () => expect(statutoryAgeMonths(1988, false, 0)).toBe(66 * 12 + 11));
  it("1989 and 2005 → 67y", () => {
    expect(statutoryAgeMonths(1989, false, 0)).toBe(804);
    expect(statutoryAgeMonths(2005, true, 2)).toBe(804);
  });
});
describe("rates by pension year", () => {
  it("first band", () => {
    expect(firstBandRate(2026)).toBeCloseTo(0.99);
    expect(firstBandRate(2030)).toBeCloseTo(0.95);
    expect(firstBandRate(2035)).toBeCloseTo(0.9);
    expect(firstBandRate(2060)).toBeCloseTo(0.9);
  });
  it("per insured year", () => {
    expect(yearRate(2026)).toBeCloseTo(0.01495);
    expect(yearRate(2030)).toBeCloseTo(0.01475);
    expect(yearRate(2058)).toBeCloseTo(0.0145);
  });
});

describe("statePension", () => {
  const p = { birthYear: 1991, female: false, children: 0, gross: 48967, yearsWorked: 12, workUntilAge: 99, earlyMonths: 0, currentYear: 2026 };
  it("spec sanity example: average wage, 44 years, pension in 2058 → 21,821", () => {
    const r = statePension(p);
    expect(r.startYear).toBe(2058);
    expect(r.insuredYears).toBe(44);
    expect(r.calcBase).toBe(26521);
    expect(r.monthly).toBe(21821);
  });
  it("stopping at 48 dilutes the base and delays the pension 5 years", () => {
    const r = statePension({ ...p, workUntilAge: 48 });
    expect(r.insuredYears).toBe(25);
    expect(r.base).toBeCloseTo((48967 * 25) / 44, 0);
    expect(r.delayed).toBe(true);
    expect(r.startMonths).toBe(804 + 60);
    expect(r.calcBase).toBe(21024);
    expect(r.monthly).toBe(4900 + 7622);
  });
  it("eligibility at 35 / 34 / 20 / 19 insured years", () => {
    const full = (years: number) => statePension({ ...p, yearsWorked: years - 32 });
    const stop = (years: number) => statePension({ ...p, yearsWorked: 0, workUntilAge: 35 + years });
    expect(full(35).delayed).toBe(false);
    expect(full(34).delayed).toBe(true);
    expect(stop(20)).toMatchObject({ eligible: true, delayed: true });
    expect(stop(19)).toMatchObject({ eligible: false, monthly: 0 });
  });
  it("low earner gets the 4,900 percentage floor → 9,800", () => {
    expect(statePension({ ...p, gross: 5000 }).monthly).toBe(9800);
  });
  it("children add 500 each", () => {
    expect(statePension({ ...p, children: 2 }).monthly).toBe(21821 + 1000);
  });
  it("early pension 36 months: 13 blocks × 1.5 % of the calculation base", () => {
    const r = statePension({ ...p, earlyMonths: 36 });
    expect(r.earlyAllowed).toBe(true);
    expect(r.startMonths).toBe(804 - 36);
    expect(r.monthly).toBeLessThan(21821);
    const cut = r.calcBase * 13 * 0.015;
    expect(r.earlyCut).toBeGreaterThanOrEqual(0);
    expect(Math.abs(r.earlyCut - cut)).toBeLessThanOrEqual(1);
  });
  it("early pension refused under 40 insured years", () => {
    // 5 prior years + 32 to statutory = 37 insured (not delayed), but only 34 at the early start
    const r = statePension({ ...p, yearsWorked: 5, earlyMonths: 36 });
    expect(r.earlyAllowed).toBe(false);
    expect(r.delayed).toBe(false);
    expect(r.startMonths).toBe(804);
  });
});

describe("DPS / DIP, tax line, scenario, summary", () => {
  it("DPS state contribution steps", () => {
    expect([499, 500, 1000, 1700, 3000].map(dpsStateContribution)).toEqual([0, 100, 200, 340, 340]);
  });
  it("open age: pre-2024 DPS at 60, 2024+ DPS needs 120 months", () => {
    expect(potOpenMonths(1991, 2020, "dps")).toBe(720);
    expect(potOpenMonths(1991, 2055, "dps")).toBe((64 + 10) * 12);
    expect(potOpenMonths(1991, 2055, "dip")).toBe((64 + 10) * 12);
    expect(potOpenMonths(1991, 2026, "dip")).toBe(720);
  });
  it("tax line", () => {
    expect(taxSaving(2000, 3000)).toBe(5940);
    expect(taxSaving(5700, 0)).toBe(7200);
    expect(taxSaving(10000, 10000)).toBe(7200);
  });
  it("drawdown at 0 % real: 1.2M over 20 years → 5,000", () => {
    expect(drawdownMonthly(1_200_000, 20, 0)).toBeCloseTo(5000, 6);
  });
  it("projectPot at 0 % real equals balance + contributions", () => {
    const r = projectPot({ balance: 10000, own: 1000, employer: 500, startYear: 2020, ret: 2 }, "dps",
      { birthYear: 1991, currentYear: 2026, contributeUntilMonths: 36 * 12, infl: 2 });
    expect(r.openMonths).toBe(720);
    expect(r.paidIn).toBe(12000);
    expect(r.employer).toBe(6000);
    expect(r.state).toBe(2400);
    expect(r.atOpen).toBeCloseTo(10000 + 12000 + 6000 + 2400, 0);
  });
  it("normalisePension clamps start years and workUntil from share links", () => {
    const s = normalisePension({ dpsStart: 1e9, dipStart: 1800, workUntil: 5 }, 2026);
    expect(s.dpsStart).toBe(2076);
    expect(s.dipStart).toBe(1990);
    expect(s.workUntil).toBe(18);
    expect(normalisePension({ workUntil: 500 }, 2026).workUntil).toBe(100);
    expect(normalisePension({ workUntil: -3 }, 2026).workUntil).toBe(0);
    expect(normalisePension({ workUntil: 0 }, 2026).workUntil).toBe(0);
  });

  it("normalisePension clamps nonsense", () => {
    const s = normalisePension({ birthYear: 1900, yearsWorked: 80, children: -2, dpsOwn: -5 }, 2026);
    expect(s.birthYear).toBe(1961);
    expect(s.yearsWorked).toBe(2026 - 1961 - 15);
    expect(s.children).toBe(0);
    expect(s.dpsOwn).toBe(0);
    expect(Number.isFinite(retirementSummary(s, { currentYear: 2026, salaryGross: null }).totalMonthly)).toBe(true);
  });
  it("params round-trip and missing params → null", () => {
    const s = pensionDefaults(2026);
    expect(pensionFromParams(new URLSearchParams(pensionToParams(s)), 2026)).toEqual(s);
    expect(pensionFromParams(new URLSearchParams("usePension=1"), 2026)).toBeNull();
  });
  it("resolveGross follows Salary unless overridden", () => {
    const s = pensionDefaults(2026);
    expect(resolveGross(s, 60000)).toBe(60000);
    expect(resolveGross({ ...s, grossOverride: true, gross: 30000 }, 60000)).toBe(30000);
    expect(resolveGross(s, null)).toBe(48967);
  });
  it("summary stops contributions at stopAge", () => {
    const s = { ...pensionDefaults(2026), birthYear: 1991, dpsOwn: 1000 };
    const a = retirementSummary(s, { currentYear: 2026, salaryGross: null });
    const b = retirementSummary(s, { currentYear: 2026, salaryGross: null, stopAge: 45 });
    expect(b.savingsAtOpen).toBeLessThan(a.savingsAtOpen);
    expect(b.pension.monthly).toBeLessThan(a.pension.monthly);
  });
});

describe("resolvePlanPension", () => {
  const stored = pensionDefaults(2026);
  const fromUrl = { ...pensionDefaults(2026), birthYear: 1990 };
  it("off when usePension is false", () =>
    expect(resolvePlanPension({ usePension: false, fromUrl, stored, currency: "CZK" })).toBeNull());
  it("off for non-CZK currency", () =>
    expect(resolvePlanPension({ usePension: true, fromUrl, stored, currency: "EUR" })).toBeNull());
  it("null with nothing from URL or storage", () =>
    expect(resolvePlanPension({ usePension: true, fromUrl: null, stored: null, currency: "CZK" })).toBeNull());
  it("URL wins over stored", () =>
    expect(resolvePlanPension({ usePension: true, fromUrl, stored, currency: "CZK" })).toBe(fromUrl));
  it("stored used without URL params", () =>
    expect(resolvePlanPension({ usePension: true, fromUrl: null, stored, currency: "CZK" })).toBe(stored));
});

describe("insured years in whole months (M1)", () => {
  const base = { female: false, children: 0, gross: 48967, workUntilAge: 99, earlyMonths: 0, currentYear: 2026 };
  it("exactly 40 years at the early start allows the early pension (1964, 38 years, 10 months early)", () => {
    const r = statePension({ ...base, birthYear: 1964, yearsWorked: 38, earlyMonths: 10 });
    expect(r.earlyAllowed).toBe(true);
    expect(r.insuredYears).toBe(40);
    expect(r.startMonths).toBe(64 * 12 + 10 - 10);
  });
  it("exactly 45 years at the early start halves the cut (1964, 43 years, 10 months early)", () => {
    const r = statePension({ ...base, birthYear: 1964, yearsWorked: 43, earlyMonths: 10 });
    expect(r.insuredYears).toBe(45);
    const blocks = Math.ceil((10 * 30.4167) / 90);
    expect(Math.abs(r.earlyCut - r.calcBase * blocks * 0.0075)).toBeLessThanOrEqual(1);
  });
  it("exactly 35 years at the statutory age is not delayed; 34 is", () => {
    // 1980: statutory 66y 3m; age 46 today. 35 years = 420 months = yearsWorked × 12 + (795 − 552).
    const at = (months: number) => statePension({ ...base, birthYear: 1980, yearsWorked: months / 12 });
    expect(at(420 - 243)).toMatchObject({ insuredYears: 35, delayed: false });
    expect(at(419 - 243)).toMatchObject({ insuredYears: 34, delayed: true });
  });
  it("exactly 20 years at the statutory age is eligible; 19 is not", () => {
    // Stop work so that exactly 240 / 239 insured months accrue.
    const stop = (months: number) =>
      statePension({ ...base, birthYear: 1980, yearsWorked: 0, workUntilAge: 46 + months / 12 });
    expect(stop(240)).toMatchObject({ insuredYears: 20, eligible: true });
    expect(stop(239)).toMatchObject({ insuredYears: 19, eligible: false });
  });
  it("a continuous career to a statutory age with extra months has dilution ratio exactly 1", () => {
    for (const by of [1973, 1975, 1980, 1985, 1988]) {
      const r = statePension({ ...base, birthYear: by, yearsWorked: 2026 - by - 22, earlyMonths: 0 });
      expect(r.base).toBe(48967);
    }
  });
});

describe("early months clamp lives in the summary (I2)", () => {
  it("stored 36 months with only 5 allowed → the summary uses 5", () => {
    const s = normalisePension({ birthYear: 1970, yearsWorked: 31, earlyMonths: 36 }, 2026);
    const r = retirementSummary(s, { currentYear: 2026, salaryGross: null });
    expect(r.earlyMax).toBe(5);
    expect(r.earlyMonths).toBe(5);
    expect(r.pension.earlyAllowed).toBe(true);
    expect(r.pension.startMonths).toBe(65 * 12 + 5 - 5);
  });
  it("no early pension allowed → 0 months, regular start", () => {
    const s = normalisePension({ birthYear: 1991, yearsWorked: 5, earlyMonths: 36 }, 2026);
    const r = retirementSummary(s, { currentYear: 2026, salaryGross: null });
    expect(r.earlyMax).toBe(0);
    expect(r.earlyMonths).toBe(0);
    expect(r.pension.startMonths).toBe(804);
  });
});

describe("resolvePlanPension: stored wins unless the plan is a shared link (I4)", () => {
  const stored = pensionDefaults(2026);
  const fromUrl = { ...pensionDefaults(2026), birthYear: 1990 };
  const o = { usePension: true, fromUrl, stored, currency: "CZK" };
  it("own plan URL (not a shared link) → stored wins", () =>
    expect(resolvePlanPension({ ...o, planFromUrl: false })).toBe(stored));
  it("shared link, edited this session → stored wins", () =>
    expect(resolvePlanPension({ ...o, planFromUrl: true, edited: true })).toBe(stored));
  it("shared link, not edited → URL wins", () =>
    expect(resolvePlanPension({ ...o, planFromUrl: true, edited: false })).toBe(fromUrl));
  it("nothing stored → URL pension is used", () =>
    expect(resolvePlanPension({ ...o, stored: null, planFromUrl: false })).toBe(fromUrl));
});
