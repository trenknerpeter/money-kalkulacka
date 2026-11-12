import { describe, expect, it } from "vitest";
import { firstBandRate, statePension, statutoryAgeMonths, yearRate } from "./pension";

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
