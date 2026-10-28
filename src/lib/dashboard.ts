import { num } from "./finance";
import { loadPlan, potsAfterMonths, startPot, type SavedPlan } from "./plan";
import {
  ageAt,
  homeValueAt,
  mortgageSchedule,
  realBalanceAt,
  retirementMilestones,
} from "./retirement";

export type InvestScenario = {
  initial: number;
  monthly: number;
  rate: number;
  years: number;
  inflation: number;
  real: boolean;
  withdrawRate: number;
  savings: boolean;
  sInitial: number;
  sMonthly: number;
  sRate: number;
};

export type MortgageScenario = {
  principal: number;
  rate: number;
  years: number;
  payment: number;
  solveTerm: boolean;
  extraPayment?: boolean;
  extraAmount?: number;
  extraYear?: number;
  extraYearly?: boolean;
  homeValue: number;
  homeGrowth: boolean;
  homeRate: number;
};

export type DashboardStore = {
  income: number;
};

export const DASH_KEY = "finbuddy.dashboard.v1";

/** Reads a stored value; defaults to localStorage, or pass a saved snapshot's data. */
export type Source = (key: string) => string | null;
const local: Source = (key) => window.localStorage.getItem(key);

function readJson<T>(key: string, get: Source = local): Partial<T> | null {
  try {
    const raw = get(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

export function loadInvest(get?: Source): InvestScenario | null {
  const p = readJson<InvestScenario>("finbuddy.invest", get);
  if (!p || typeof p.initial !== "number") return null;
  return {
    initial: num(p.initial),
    monthly: num(p.monthly),
    rate: num(p.rate, 7),
    years: num(p.years, 20),
    inflation: num(p.inflation, 2),
    real: Boolean(p.real),
    withdrawRate: num(p.withdrawRate, 4),
    savings: Boolean(p.savings),
    sInitial: num(p.sInitial),
    sMonthly: num(p.sMonthly),
    sRate: num(p.sRate, 3),
  };
}

export function loadMortgage(get?: Source): MortgageScenario | null {
  const p = readJson<MortgageScenario>("finbuddy.mortgage", get);
  if (!p || typeof p.principal !== "number") return null;
  return {
    principal: num(p.principal),
    rate: num(p.rate, 3.5),
    years: num(p.years, 20),
    payment: num(p.payment),
    solveTerm: Boolean(p.solveTerm),
    extraPayment: Boolean(p.extraPayment),
    extraAmount: num(p.extraAmount),
    extraYear: num(p.extraYear, 3),
    extraYearly: Boolean(p.extraYearly),
    homeValue: num(p.homeValue),
    homeGrowth: Boolean(p.homeGrowth),
    homeRate: num(p.homeRate, 1),
  };
}

export function loadDashboard(get?: Source): DashboardStore {
  const p = readJson<DashboardStore>(DASH_KEY, get);
  return { income: num(p?.income) };
}

export function saveDashboard(store: DashboardStore) {
  try {
    window.localStorage.setItem(DASH_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export type PathRow = {
  age: number;
  pot: number;
  /** Your number plus the mortgage still owed, in today's money. */
  need: number;
  debt: number;
};

export type DashboardMetrics = {
  assets: number;
  invested: number;
  cash: number;
  homeValue: number;
  mortgageBalance: number;
  /** Home + investments + savings − mortgage. */
  netWorth: number;
  savingsRate: number | null;
  /** Share of the home you own outright; null without a home value. */
  ownership: number | null;
  /** Months until the mortgage is paid off; null if never or no mortgage. */
  mortgageMonths: number | null;
  readiness: number | null;
  livingAge: number | null;
  debtFreeAge: number | null;
  /** Mortgage still owed at the living age, in today's money. */
  owedAtLiving: number;
  age: number | null;
  targetAge: number;
  target: number | null;
  mortgagePayment: number;
  monthlyInvesting: number;
  monthlySavings: number;
  freeCash: number | null;
  income: number;
  /** Retirement path rows (plan only). */
  path: PathRow[];
  /** Net worth at the debt-free age (or living age / target age), with its parts. */
  /** `clearable`: the pot also covers the debt then, so it can be paid off in one go. */
  outlook: {
    age: number;
    netWorth: number;
    home: number;
    invested: number;
    cash: number;
    debt: number;
    clearable: boolean;
  } | null;
};

export function deriveMetrics(input: {
  invest: InvestScenario | null;
  mortgage: MortgageScenario | null;
  plan: SavedPlan | null;
  income: number;
}): DashboardMetrics {
  const { invest, mortgage, plan, income } = input;

  // Single source of truth for what you own today: Plan if answered, otherwise the Invest tab.
  const invested = plan ? num(plan.invested) : invest ? num(invest.initial) : 0;
  const cash = plan ? num(plan.cash) : invest?.savings ? num(invest.sInitial) : 0;
  const assets = invested + cash;

  const schedule = mortgage && mortgage.principal > 0 ? mortgageSchedule(mortgage) : null;
  const mortgageBalance = mortgage ? num(mortgage.principal) : 0;
  const homeValue = mortgage ? num(mortgage.homeValue) : 0;
  const netWorth = homeValue + assets - mortgageBalance;
  const ownership =
    homeValue > 0 ? Math.max(0, Math.min(1, (homeValue - mortgageBalance) / homeValue)) : null;

  const monthlyInvesting = plan ? num(plan.saveInvest) : invest ? num(invest.monthly) : 0;
  const monthlySavings = plan ? num(plan.saveCash) : invest?.savings ? num(invest.sMonthly) : 0;
  const monthlySaving = monthlyInvesting + monthlySavings;
  const savingsRate = income > 0 && monthlySaving > 0 ? monthlySaving / income : null;

  const mortgagePayment = schedule ? schedule.payment : 0;
  const freeCash = income > 0 ? income - mortgagePayment - monthlySaving : null;

  let readiness: number | null = null;
  let livingAge: number | null = null;
  let debtFreeAge: number | null = null;
  let owedAtLiving = 0;
  let target: number | null = null;
  const path: PathRow[] = [];
  let outlook: DashboardMetrics["outlook"] = null;

  if (plan) {
    const ms = retirementMilestones(plan, plan, schedule);
    const debtAt = (m: number) => realBalanceAt(schedule, m, plan.infl);
    if (isFinite(ms.target) && ms.target > 0) {
      target = ms.target;
      readiness = startPot(plan) / ms.target;
    }
    livingAge = ms.livingMonths === null ? null : ageAt(plan, ms.livingMonths);
    debtFreeAge = ms.debtFreeMonths === null ? null : ageAt(plan, ms.debtFreeMonths);
    owedAtLiving = ms.owedAtLiving;

    // Runs a few years past the later of the target age and being debt-free.
    const start = Math.round(num(plan.age));
    const later = Math.max(Math.round(num(plan.stop)), debtFreeAge ?? livingAge ?? 0);
    const end = Math.min(90, later + 3);
    for (let age = start; age <= end; age++) {
      const m = (age - start) * 12;
      const debt = debtAt(m);
      path.push({ age, pot: potsAfterMonths(plan, plan, m).total, need: ms.target + debt, debt });
    }

    const outlookMonths =
      ms.debtFreeMonths ?? ms.livingMonths ?? Math.max(0, (num(plan.stop) - num(plan.age)) * 12);
    const debt = debtAt(outlookMonths);
    const home = mortgage ? homeValueAt(mortgage, outlookMonths) : 0;
    const pots = potsAfterMonths(plan, plan, outlookMonths);
    outlook = {
      age: ageAt(plan, outlookMonths),
      netWorth: home + pots.total - debt,
      home,
      invested: pots.invest,
      cash: pots.savings,
      debt,
      clearable: ms.debtFreeMonths !== null,
    };
  }

  return {
    assets,
    invested,
    cash,
    homeValue,
    mortgageBalance,
    netWorth,
    savingsRate,
    ownership,
    mortgageMonths: schedule?.months ?? null,
    readiness,
    livingAge,
    debtFreeAge,
    owedAtLiving,
    age: plan ? num(plan.age) : null,
    targetAge: plan ? num(plan.stop) : 0,
    target,
    mortgagePayment,
    monthlyInvesting,
    monthlySavings,
    freeCash,
    income,
    path,
    outlook,
  };
}

/** Headline metrics for a saved snapshot, without loading it. */
export function snapshotMetrics(data: Record<string, string>): DashboardMetrics {
  const get: Source = (key) => data[key] ?? null;
  return deriveMetrics({
    invest: loadInvest(get),
    mortgage: loadMortgage(get),
    plan: loadPlan(get),
    income: loadDashboard(get).income,
  });
}
