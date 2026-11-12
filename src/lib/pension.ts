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

export type StatePensionInput = {
  birthYear: number;
  female: boolean;
  children: number;
  /** Today's monthly gross, CZK. */
  gross: number;
  /** Insured years so far. */
  yearsWorked: number;
  /** Age (years) earnings and insurance stop; at or above the statutory age → work to statutory. */
  workUntilAge: number;
  /** Early pension, 0–36 months; 0 = none. */
  earlyMonths: number;
  currentYear: number;
};

export type StatePensionResult = {
  /** At least 20 insured years. */
  eligible: boolean;
  /** 20–34 insured years → pension starts 60 months after the statutory age. */
  delayed: boolean;
  statutoryMonths: number;
  /** Age in months at which the pension actually starts. */
  startMonths: number;
  startYear: number;
  /** Whole insured years. */
  insuredYears: number;
  /** Diluted gross. */
  base: number;
  /** Výpočtový základ, rounded up. */
  calcBase: number;
  /** Základní výměra (0 if not eligible). */
  basic: number;
  /** Procentní výměra incl. výchovné, after the floor and the early cut. */
  percent: number;
  /** Insured years at the early start are at least 40. */
  earlyAllowed: boolean;
  /** Kč a month removed by the early pension. */
  earlyCut: number;
  /** basic + percent; 0 if not eligible. */
  monthly: number;
};

export function statePension(i: StatePensionInput, rules: PensionRules = CZ_PENSION_2026): StatePensionResult {
  const statutoryMonths = statutoryAgeMonths(i.birthYear, i.female, i.children);
  const statY = statutoryMonths / 12;
  const currentAge = i.currentYear - i.birthYear;
  const firstJobAge = currentAge - i.yearsWorked;
  const earlyYears = Math.max(0, i.earlyMonths) / 12;

  const insuredTo = (stopY: number) => Math.floor(i.yearsWorked + Math.max(0, stopY - currentAge));
  const insuredNormal = insuredTo(Math.min(i.workUntilAge, statY));
  const insuredEarly = insuredTo(Math.min(i.workUntilAge, statY - earlyYears));

  const eligible = insuredNormal >= 20;
  const delayed = eligible && insuredNormal < 35;
  const earlyAllowed = i.earlyMonths > 0 && !delayed && eligible && insuredEarly >= 40;
  const insuredYears = earlyAllowed ? insuredEarly : insuredNormal;
  const earlyMonths = earlyAllowed ? i.earlyMonths : 0;

  const startMonths = delayed ? statutoryMonths + 60 : statutoryMonths - earlyMonths;
  const startYear = i.birthYear + Math.floor(startMonths / 12);

  const ratio = Math.min(1, insuredYears / Math.max(1, statY - firstJobAge));
  const base = i.gross * ratio;

  const empty = { eligible, delayed, statutoryMonths, startMonths, startYear, insuredYears, base, calcBase: 0, basic: 0, percent: 0, earlyAllowed, earlyCut: 0, monthly: 0 };
  if (!eligible) return empty;

  const calcBase = Math.ceil(
    firstBandRate(startYear) * Math.min(base, rules.rh1) +
      rules.upperRate * Math.min(Math.max(base - rules.rh1, 0), rules.rh2 - rules.rh1),
  );
  const raw = calcBase * yearRate(startYear) * insuredYears;
  const blocks = Math.ceil((earlyMonths * 30.4167) / 90);
  const cut = calcBase * blocks * (insuredYears >= 45 ? 0.0075 : 0.015);
  const children = rules.perChild * Math.max(0, i.children);
  const percent = Math.ceil(Math.max(rules.minPercent, raw - cut)) + children;
  const earlyCut = Math.max(0, Math.ceil(raw) - (percent - children));

  return { ...empty, calcBase, basic: rules.basic, percent, earlyCut, monthly: rules.basic + percent };
}
