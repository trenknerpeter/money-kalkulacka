import { describe, expect, it } from "vitest";
import { firstBandRate, statutoryAgeMonths, yearRate } from "./pension";

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
