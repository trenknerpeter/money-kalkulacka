/**
 * Czech state pension rules and statutory retirement age.
 * Pure: no React, no browser APIs.
 *
 * Sources: act 155/1995 Sb. (as amended by 270/2023 Sb. and 417/2024 Sb.) for the
 * retirement age; decree 365/2025 Sb. for the 2026 pension amounts and thresholds;
 * ČSSZ handbook 2026.
 */

import { num } from "./finance";
import { potAfterMonths, realMonthlyRate } from "./plan";
import type { Source } from "./dashboard";

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

/* ------------------------------ DPS / DIP pots ------------------------------ */

/** DPS state contribution a month: nothing under 500, then 20% of own up to 1,700 (max 340). */
export function dpsStateContribution(own: number): number {
  const o = num(own);
  if (o < 500) return 0;
  return 0.2 * Math.min(o, 1700);
}

/** Age in months at which a DPS/DIP pot opens: 60, and at least 120 months after the contract start (60 for DPS from before 2024). */
export function potOpenMonths(birthYear: number, startYear: number, kind: "dps" | "dip"): number {
  const minSavedYears = kind === "dps" && startYear < 2024 ? 5 : 10;
  return Math.max(60 * 12, (startYear + minSavedYears - birthYear) * 12);
}

export type PotProjection = {
  openMonths: number;
  atOpen: number;
  atMonths: (ageMonths: number) => number;
  paidIn: number;
  employer: number;
  state: number;
  growth: number;
};

export function projectPot(
  pot: { balance: number; own: number; employer: number; startYear: number; ret: number },
  kind: "dps" | "dip",
  ctx: { birthYear: number; currentYear: number; contributeUntilMonths: number; infl: number },
): PotProjection {
  const nowMonths = (ctx.currentYear - ctx.birthYear) * 12;
  const openMonths = potOpenMonths(ctx.birthYear, pot.startYear, kind);
  const r = realMonthlyRate(pot.ret, ctx.infl);
  const own = num(pot.own);
  const employer = num(pot.employer);
  const state = kind === "dps" ? dpsStateContribution(own) : 0;
  const monthly = own + employer + state;
  const balance = num(pot.balance);

  const contribMonths = (toMonths: number) =>
    Math.max(0, Math.min(toMonths, ctx.contributeUntilMonths) - nowMonths);
  const atMonths = (ageMonths: number): number => {
    const n = Math.max(0, ageMonths - nowMonths);
    // Contributions run first, then the pot just compounds.
    const c = contribMonths(ageMonths);
    const afterContrib = potAfterMonths(balance, monthly, r, c);
    return potAfterMonths(afterContrib, 0, r, n - c);
  };

  const m = contribMonths(openMonths);
  const atOpen = atMonths(openMonths);
  const paidIn = own * m;
  const employerSum = employer * m;
  const stateSum = state * m;
  return {
    openMonths,
    atOpen,
    atMonths,
    paidIn,
    employer: employerSum,
    state: stateSum,
    growth: atOpen - paidIn - employerSum - stateSum - balance,
  };
}

/** Monthly payment that empties the pot over `years`, at a real annual return in percent. */
export function drawdownMonthly(pot: number, years: number, realAnnualPct: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const r = Math.pow(1 + realAnnualPct / 100, 1 / 12) - 1;
  if (Math.abs(r) < 1e-12) return pot / months;
  return (pot * r) / (1 - Math.pow(1 + r, -months));
}

/** Yearly income-tax saving (Kč): 15% of own DPS above 1,700 plus own DIP, capped at 48,000 a year. */
export function taxSaving(ownDps: number, ownDip: number): number {
  const deductible = Math.max(0, num(ownDps) - 1700) * 12 + num(ownDip) * 12;
  return Math.round(0.15 * Math.min(48000, deductible) * 100) / 100;
}

/* --------------------------------- Scenario --------------------------------- */

export type PensionScenario = {
  birthYear: number;
  female: boolean;
  children: number;
  gross: number;
  grossOverride: boolean;
  yearsWorked: number;
  /** 0 = statutory age. */
  workUntil: number;
  /** 0–36. */
  earlyMonths: number;
  dpsBalance: number;
  dpsOwn: number;
  dpsEmployer: number;
  dpsStart: number;
  dpsRet: number;
  dipBalance: number;
  dipOwn: number;
  dipEmployer: number;
  dipStart: number;
  dipRet: number;
  drawYears: number;
  infl: number;
};

export const PENSION_KEY = "finbuddy.pension.v1";

export function pensionDefaults(currentYear: number): PensionScenario {
  return {
    birthYear: currentYear - 35,
    female: false,
    children: 0,
    gross: 48967,
    grossOverride: false,
    yearsWorked: 13,
    workUntil: 0,
    earlyMonths: 0,
    dpsBalance: 0,
    dpsOwn: 0,
    dpsEmployer: 0,
    dpsStart: currentYear,
    dpsRet: 4,
    dipBalance: 0,
    dipOwn: 0,
    dipEmployer: 0,
    dipStart: currentYear,
    dipRet: 7,
    drawYears: 20,
    infl: 2,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function normalisePension(raw: Partial<PensionScenario>, currentYear: number): PensionScenario {
  const d = pensionDefaults(currentYear);
  const birthYear = Math.round(clamp(num(raw.birthYear, d.birthYear), 1961, currentYear - 18));
  const currentAge = currentYear - birthYear;
  const money = (v: unknown, fb: number) => num(v, fb);
  return {
    birthYear,
    female: Boolean(raw.female ?? d.female),
    children: Math.round(clamp(num(raw.children, d.children), 0, 10)),
    gross: money(raw.gross, d.gross),
    grossOverride: Boolean(raw.grossOverride ?? d.grossOverride),
    yearsWorked: clamp(num(raw.yearsWorked, d.yearsWorked), 0, Math.max(0, currentAge - 15)),
    workUntil: (() => {
      const w = money(raw.workUntil, d.workUntil);
      return w <= 0 ? 0 : clamp(w, 18, 100);
    })(),
    earlyMonths: Math.round(clamp(num(raw.earlyMonths, d.earlyMonths), 0, 36)),
    dpsBalance: money(raw.dpsBalance, d.dpsBalance),
    dpsOwn: money(raw.dpsOwn, d.dpsOwn),
    dpsEmployer: money(raw.dpsEmployer, d.dpsEmployer),
    dpsStart: Math.round(clamp(num(raw.dpsStart, d.dpsStart) || d.dpsStart, 1990, currentYear + 50)),
    dpsRet: clamp(num(raw.dpsRet, d.dpsRet), 0, 15),
    dipBalance: money(raw.dipBalance, d.dipBalance),
    dipOwn: money(raw.dipOwn, d.dipOwn),
    dipEmployer: money(raw.dipEmployer, d.dipEmployer),
    dipStart: Math.round(clamp(num(raw.dipStart, d.dipStart) || d.dipStart, 1990, currentYear + 50)),
    dipRet: clamp(num(raw.dipRet, d.dipRet), 0, 15),
    drawYears: Math.round(clamp(num(raw.drawYears, d.drawYears), 10, 30)),
    infl: clamp(num(raw.infl, d.infl), 0, 15),
  };
}

const BOOL_KEYS = ["female", "grossOverride"] as const;
const NUM_KEYS = [
  "birthYear", "children", "gross", "yearsWorked", "workUntil", "earlyMonths",
  "dpsBalance", "dpsOwn", "dpsEmployer", "dpsStart", "dpsRet",
  "dipBalance", "dipOwn", "dipEmployer", "dipStart", "dipRet", "drawYears", "infl",
] as const;

export function loadPension(get?: Source): PensionScenario | null {
  try {
    const read: Source = get ?? ((key) => window.localStorage.getItem(key));
    const raw = read(PENSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PensionScenario> | null;
    if (!p || typeof p !== "object" || typeof p.birthYear !== "number") return null;
    return normalisePension(p, new Date().getFullYear());
  } catch {
    return null;
  }
}

export function pensionToParams(s: PensionScenario): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of BOOL_KEYS) out[`p_${k}`] = s[k] ? "1" : "0";
  for (const k of NUM_KEYS) out[`p_${k}`] = String(s[k]);
  return out;
}

export function pensionFromParams(params: URLSearchParams, currentYear: number): PensionScenario | null {
  if (!params.has("p_birthYear")) return null;
  const raw: Record<string, number | boolean> = {};
  for (const k of NUM_KEYS) {
    const v = params.get(`p_${k}`);
    if (v !== null) raw[k] = parseFloat(v);
  }
  for (const k of BOOL_KEYS) {
    const v = params.get(`p_${k}`);
    if (v !== null) raw[k] = v === "1" || v === "true";
  }
  return normalisePension(raw as Partial<PensionScenario>, currentYear);
}

export function resolveGross(s: PensionScenario, salaryGross: number | null): number {
  return s.grossOverride ? s.gross : (salaryGross ?? s.gross);
}

/* --------------------------------- Summary ---------------------------------- */

export type RetirementSummary = {
  currentAge: number;
  pension: StatePensionResult;
  dps: PotProjection | null;
  dip: PotProjection | null;
  savingsOpenMonths: number;
  savingsAtOpen: number;
  savingsAtPension: number;
  drawdown: number;
  totalMonthly: number;
  taxSaving: number;
};

export function retirementSummary(
  s: PensionScenario,
  opts: { currentYear: number; salaryGross: number | null; stopAge?: number },
): RetirementSummary {
  const { currentYear, stopAge } = opts;
  const statutory = statutoryAgeMonths(s.birthYear, s.female, s.children);
  const stopping = stopAge !== undefined;
  const workUntilAge = stopping ? stopAge : s.workUntil || statutory / 12;

  const pension = statePension({
    birthYear: s.birthYear,
    female: s.female,
    children: s.children,
    gross: resolveGross(s, opts.salaryGross),
    yearsWorked: s.yearsWorked,
    workUntilAge,
    earlyMonths: stopping ? 0 : s.earlyMonths,
    currentYear,
  });

  // Contributions stop when work stops, and never run past the start of the state pension.
  const contributeUntilMonths = Math.min(
    stopping ? Math.round(stopAge * 12) : s.workUntil ? Math.round(s.workUntil * 12) : statutory,
    pension.startMonths,
  );
  const ctx = { birthYear: s.birthYear, currentYear, contributeUntilMonths, infl: s.infl };

  const hasDps = s.dpsBalance > 0 || s.dpsOwn > 0 || s.dpsEmployer > 0;
  const hasDip = s.dipBalance > 0 || s.dipOwn > 0 || s.dipEmployer > 0;
  const dps = hasDps
    ? projectPot({ balance: s.dpsBalance, own: s.dpsOwn, employer: s.dpsEmployer, startYear: s.dpsStart, ret: s.dpsRet }, "dps", ctx)
    : null;
  const dip = hasDip
    ? projectPot({ balance: s.dipBalance, own: s.dipOwn, employer: s.dipEmployer, startYear: s.dipStart, ret: s.dipRet }, "dip", ctx)
    : null;

  const both = (m: number) => (dps?.atMonths(m) ?? 0) + (dip?.atMonths(m) ?? 0);
  const savingsOpenMonths = Math.max(dps?.openMonths ?? 0, dip?.openMonths ?? 0);
  const savingsAtOpen = both(savingsOpenMonths);
  const savingsAtPension = both(pension.startMonths);

  const dpsAtP = dps?.atMonths(pension.startMonths) ?? 0;
  const dipAtP = dip?.atMonths(pension.startMonths) ?? 0;
  const ret = dps && (!dip || dpsAtP >= dipAtP) ? s.dpsRet : s.dipRet;
  const realPct = ((1 + ret / 100) / (1 + s.infl / 100) - 1) * 100;
  const drawdown = dps || dip ? drawdownMonthly(savingsAtPension, s.drawYears, realPct) : 0;

  return {
    currentAge: currentYear - s.birthYear,
    pension,
    dps,
    dip,
    savingsOpenMonths,
    savingsAtOpen,
    savingsAtPension,
    drawdown,
    totalMonthly: pension.monthly + drawdown,
    taxSaving: taxSaving(s.dpsOwn, s.dipOwn),
  };
}
