import { describe, expect, it } from "vitest";
import { computeInvest } from "./finance";
import {
  DEFAULT_ASSUMPTIONS,
  planDiffersFromInvest,
  planFromInvest,
  potsAfterMonths,
  realDeposits,
  type PlanProfile,
  type SavedPlan,
} from "./plan";

const profile = {
  age: 35,
  stop: 55,
  spend: 60000,
  invested: 800_000,
  cash: 1_100_000,
  saveInvest: 20_000,
  saveCash: 30_000,
} as unknown as PlanProfile;

describe("plan projection uses fixed deposits", () => {
  it("matches the Invest tab's today's-money value for the same inputs", () => {
    const a = { ...DEFAULT_ASSUMPTIONS, ret: 8, cashRet: 3.5, infl: 2 };
    const pots = potsAfterMonths(profile, a, 240);
    const inv = computeInvest({
      initial: 800_000,
      monthly: 20_000,
      rate: 8,
      years: 20,
      inflation: 2,
    });
    const sav = computeInvest({
      initial: 1_100_000,
      monthly: 30_000,
      rate: 3.5,
      years: 20,
      inflation: 2,
    });
    expect(pots.invest).toBeCloseTo(inv.realValue, 2);
    expect(pots.savings).toBeCloseTo(sav.realValue, 2);
  });
  it("fixed deposits are worth less in today's money than their koruna sum", () => {
    expect(realDeposits(50_000, 0, 240)).toBeCloseTo(12_000_000, 4);
    const real = realDeposits(50_000, 2, 240);
    expect(real).toBeLessThan(12_000_000);
    expect(real).toBeGreaterThan(9_500_000);
  });
});

describe("plan vs Invest tab", () => {
  const plan = { ...profile, ...DEFAULT_ASSUMPTIONS, usePension: false } as unknown as SavedPlan;
  const inv = {
    initial: 800_000,
    monthly: 20_000,
    rate: 8,
    inflation: 2,
    savings: true,
    sInitial: 1_100_000,
    sMonthly: 30_000,
    sRate: 3.5,
  };
  it("copies amounts and rates into the plan", () => {
    const next = planFromInvest(plan, inv);
    expect(next).toMatchObject({
      invested: 800_000,
      saveInvest: 20_000,
      ret: 8,
      infl: 2,
      cash: 1_100_000,
      saveCash: 30_000,
      cashRet: 3.5,
    });
    expect(planDiffersFromInvest(next, inv)).toBe(false);
    expect(planDiffersFromInvest(plan, inv)).toBe(true);
  });
  it("leaves savings alone when the Invest tab has no savings account", () => {
    const next = planFromInvest(plan, { ...inv, savings: false });
    expect(next.cash).toBe(plan.cash);
    expect(next.saveCash).toBe(plan.saveCash);
  });
});
