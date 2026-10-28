import { num } from "./finance";

/** Two pots: investments (`invested` + `saveInvest`) and savings (`cash` + `saveCash`). */
export type PlanProfile = {
  age: number;
  stop: number;
  spend: number;
  invested: number;
  cash: number;
  saveInvest: number;
  saveCash: number;
};

/** `ret` is the investment return, `cashRet` the savings interest rate. */
export type PlanAssumptions = {
  ret: number;
  cashRet: number;
  wd: number;
  infl: number;
};

export type SavedPlan = PlanProfile & PlanAssumptions;

export const PLAN_KEY = "finbuddy.profile.v1";

export const DEFAULT_ASSUMPTIONS: PlanAssumptions = { ret: 8, cashRet: 3, wd: 4, infl: 2 };

export const startPot = (p: Pick<PlanProfile, "invested" | "cash">) => num(p.invested) + num(p.cash);
export const monthlyTotal = (p: Pick<PlanProfile, "saveInvest" | "saveCash">) =>
  num(p.saveInvest) + num(p.saveCash);

/**
 * Normalises a stored or URL-supplied plan. Older plans had a single `pot`/`save`
 * growing at one rate: that money is treated as invested.
 */
export function normalisePlan(p: Partial<SavedPlan> & { pot?: number; save?: number }): SavedPlan {
  const invested = typeof p.invested === "number" ? num(p.invested) : num(p.pot, 25000);
  const cash = typeof p.cash === "number" ? num(p.cash) : 0;
  const saveInvest = typeof p.saveInvest === "number" ? num(p.saveInvest) : num(p.save, 500);
  const saveCash = typeof p.saveCash === "number" ? num(p.saveCash) : 0;
  return {
    age: num(p.age, 35),
    stop: num(p.stop, 60),
    spend: num(p.spend, 2500),
    invested,
    cash,
    saveInvest,
    saveCash,
    ret: num(p.ret, DEFAULT_ASSUMPTIONS.ret),
    cashRet: num(p.cashRet, DEFAULT_ASSUMPTIONS.cashRet),
    wd: num(p.wd, DEFAULT_ASSUMPTIONS.wd),
    infl: num(p.infl, DEFAULT_ASSUMPTIONS.infl),
  };
}

export function loadPlan(
  get: (key: string) => string | null = (key) => window.localStorage.getItem(key),
): SavedPlan | null {
  try {
    const raw = get(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<SavedPlan>;
    if (typeof p.age !== "number" || typeof p.stop !== "number") return null;
    return normalisePlan(p);
  } catch {
    return null;
  }
}

export function savePlan(plan: SavedPlan) {
  try {
    window.localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
}

/** Real (today's-money) monthly rate from a nominal annual return and inflation. */
export function realMonthlyRate(nominalAnnual: number, inflation: number): number {
  const realAnnual = (1 + num(nominalAnnual) / 100) / (1 + num(inflation) / 100) - 1;
  return realAnnual / 12;
}

/** The pot that funds `monthlySpend` forever at the given safe withdrawal rate. */
export function targetPotFor(monthlySpend: number, withdrawalRate: number): number {
  const wd = num(withdrawalRate);
  if (wd <= 0) return Infinity;
  return (num(monthlySpend) * 12) / (wd / 100);
}

/** Pot after n months of contributions at monthly rate r. */
export function potAfterMonths(P0: number, PMT: number, r: number, n: number): number {
  const months = Math.max(0, Math.round(n));
  if (months === 0) return num(P0);
  if (r === 0) return num(P0) + num(PMT) * months;
  const g = Math.pow(1 + r, months);
  return num(P0) * g + (num(PMT) * (g - 1)) / r;
}

export type PotSplit = { invest: number; savings: number; total: number };

/** Both pots after n months, each compounding at its own real rate. */
export function potsAfterMonths(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  n: number,
): PotSplit {
  const invest = potAfterMonths(
    profile.invested,
    profile.saveInvest,
    realMonthlyRate(assumptions.ret, assumptions.infl),
    n,
  );
  const savings = potAfterMonths(
    profile.cash,
    profile.saveCash,
    realMonthlyRate(assumptions.cashRet, assumptions.infl),
    n,
  );
  return { invest, savings, total: invest + savings };
}

const monthsToStop = (profile: PlanProfile) =>
  Math.max(0, Math.round((num(profile.stop) - num(profile.age)) * 12));

/** Combined pot at the stop age. */
export function potAtStop(profile: PlanProfile, assumptions: PlanAssumptions): number {
  return potsAfterMonths(profile, assumptions, monthsToStop(profile)).total;
}

/**
 * Applies a total monthly amount to the two pots: the savings contribution is kept
 * as answered (capped at the total) and the rest goes into investments.
 */
export function withMonthlyTotal(profile: PlanProfile, total: number): PlanProfile {
  const t = Math.max(0, num(total));
  const saveCash = Math.min(num(profile.saveCash), t);
  return { ...profile, saveCash, saveInvest: t - saveCash };
}

/** First month from now where the combined pot reaches the target, searching to age 90. null if never. */
export function monthsToTarget(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  if (!isFinite(target)) return null;
  if (startPot(profile) >= target) return 0;
  const maxMonths = Math.max(0, Math.round((90 - num(profile.age)) * 12));
  for (let m = 1; m <= maxMonths; m++) {
    if (potsAfterMonths(profile, assumptions, m).total >= target) return m;
  }
  return null;
}

/** Bisection for the smallest x in [lo, hi] where f(x) >= target; assumes f is increasing. */
function solveIncreasing(f: (x: number) => number, target: number, lo: number, hi: number): number {
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Total monthly saving (both pots) needed to hit the target exactly at the stop age.
 * Any extra goes into investments. null if no time left.
 */
export function requiredMonthly(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  if (monthsToStop(profile) === 0 || !isFinite(target)) return null;
  const f = (total: number) => potAtStop(withMonthlyTotal(profile, total), assumptions);
  if (f(0) >= target) return 0;
  let hi = Math.max(1000, monthlyTotal(profile) * 2);
  while (f(hi) < target && hi < 1e12) hi *= 2;
  return solveIncreasing(f, target, 0, hi);
}

/** Monthly spending the projected pot at the stop age would actually fund. */
export function affordableSpend(profile: PlanProfile, assumptions: PlanAssumptions): number {
  return (potAtStop(profile, assumptions) * (num(assumptions.wd) / 100)) / 12;
}

/** Nominal investment return needed to hit the target at the stop age. null if it exceeds 15%. */
export function requiredReturn(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  target: number,
): number | null {
  if (monthsToStop(profile) === 0 || !isFinite(target)) return null;
  const f = (ret: number) => potAtStop(profile, { ...assumptions, ret });
  if (f(15) < target) return null;
  return solveIncreasing(f, target, 0, 30);
}

export type PlanYearRow = {
  age: number;
  contributed: number;
  growth: number;
  balance: number;
  invest: number;
  savings: number;
  /** Remaining mortgage in today's money (0 without a mortgage). */
  debt: number;
};

/** Yearly projection rows from the current age to a few years past the later of stop/reached. */
export function planRows(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  reachedAge: number | null,
  debtAt: (months: number) => number = () => 0,
): PlanYearRow[] {
  const start = Math.round(num(profile.age));
  const later = Math.max(Math.round(num(profile.stop)), reachedAge ?? 0);
  const end = Math.min(90, later + 3);
  const rows: PlanYearRow[] = [];
  for (let age = start; age <= end; age++) {
    const months = (age - start) * 12;
    const pots = potsAfterMonths(profile, assumptions, months);
    const contributed = startPot(profile) + monthlyTotal(profile) * months;
    rows.push({
      age,
      contributed,
      growth: Math.max(0, pots.total - contributed),
      balance: pots.total,
      invest: pots.invest,
      savings: pots.savings,
      debt: debtAt(months),
    });
  }
  return rows;
}
