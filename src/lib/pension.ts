/**
 * Czech state pension rules and statutory retirement age.
 * Pure: no React, no browser APIs.
 *
 * Sources: act 155/1995 Sb. (as amended by 270/2023 Sb. and 417/2024 Sb.) for the
 * retirement age; decree 365/2025 Sb. for the 2026 pension amounts and thresholds;
 * ČSSZ handbook 2026.
 */

export type PensionRules = {
  year: number;
  /** Základní výměra, Kč a month. */
  basic: number;
  /** Minimum procentní výměra, Kč a month. */
  minPercent: number;
  /** First reduction threshold (redukční hranice 1), Kč a month. */
  rh1: number;
  /** Second reduction threshold (redukční hranice 2), Kč a month. */
  rh2: number;
  /** Share of the base between RH1 and RH2 that counts. */
  upperRate: number;
  /** Výchovné per child raised, Kč a month. */
  perChild: number;
  /** Average wage, Kč a month. */
  averageWage: number;
};

export const CZ_PENSION_2026: PensionRules = {
  year: 2026,
  basic: 4900,
  minPercent: 4900,
  rh1: 21546,
  rh2: 195868,
  upperRate: 0.26,
  perChild: 500,
  averageWage: 48967,
};

/** Share of the first band (up to RH1) that counts: 99% in 2026, −1 point a year, floor 90% from 2035. */
export function firstBandRate(pensionYear: number): number {
  const steps = Math.max(0, pensionYear - CZ_PENSION_2026.year);
  return Math.max(90, 99 - steps) / 100;
}

/** Percentage per insured year: 1.495% in 2026, −0.005 points a year, floor 1.450% from 2035. */
export function yearRate(pensionYear: number): number {
  const steps = Math.max(0, pensionYear - CZ_PENSION_2026.year);
  // Work in units of 0.001% (1.495% = 1495) so the arithmetic stays exact.
  return Math.max(1450, 1495 - 5 * steps) / 100000;
}

/** Retirement age in months for 1961–1972, as [men/W0, W1, W2, W3–4, W5+] (years × 12 + months). */
const AGE_TABLE: Record<number, [number, number, number, number, number]> = {
  1961: [64 * 12 + 4, 64 * 12 + 2, 62 * 12 + 8, 61 * 12 + 2, 59 * 12 + 8],
  1962: [64 * 12 + 6, 64 * 12 + 6, 63 * 12 + 2, 61 * 12 + 8, 60 * 12 + 2],
  1963: [64 * 12 + 8, 64 * 12 + 8, 63 * 12 + 8, 62 * 12 + 2, 60 * 12 + 8],
  1964: [64 * 12 + 10, 64 * 12 + 10, 64 * 12 + 2, 62 * 12 + 8, 61 * 12 + 2],
  1965: [65 * 12, 65 * 12, 64 * 12 + 8, 63 * 12 + 2, 61 * 12 + 8],
  1966: [65 * 12 + 1, 65 * 12 + 1, 65 * 12 + 1, 63 * 12 + 8, 62 * 12 + 2],
  1967: [65 * 12 + 2, 65 * 12 + 2, 65 * 12 + 2, 64 * 12 + 2, 62 * 12 + 8],
  1968: [65 * 12 + 3, 65 * 12 + 3, 65 * 12 + 3, 64 * 12 + 8, 63 * 12 + 2],
  1969: [65 * 12 + 4, 65 * 12 + 4, 65 * 12 + 4, 65 * 12 + 2, 63 * 12 + 8],
  1970: [65 * 12 + 5, 65 * 12 + 5, 65 * 12 + 5, 65 * 12 + 5, 64 * 12 + 2],
  1971: [65 * 12 + 6, 65 * 12 + 6, 65 * 12 + 6, 65 * 12 + 6, 64 * 12 + 8],
  1972: [65 * 12 + 7, 65 * 12 + 7, 65 * 12 + 7, 65 * 12 + 7, 65 * 12 + 2],
};

/**
 * Statutory retirement age in whole months. Children only matter for women born 1961–1972.
 * Birth years before 1961 clamp to 1961.
 */
export function statutoryAgeMonths(birthYear: number, female: boolean, children: number): number {
  const by = Math.max(1961, birthYear);
  if (by >= 1989) return 67 * 12;
  if (by >= 1973) return 65 * 12 + 8 + (by - 1973);
  const row = AGE_TABLE[by] ?? AGE_TABLE[1961]!;
  if (!female || children <= 0) return row[0];
  if (children === 1) return row[1];
  if (children === 2) return row[2];
  if (children <= 4) return row[3];
  return row[4];
}
