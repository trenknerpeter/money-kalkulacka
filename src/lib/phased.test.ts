import { describe, expect, it } from "vitest";
import { monthsToTarget, targetPotFor } from "./plan";
import { monthsToPhasedTarget, phaseSegments, phasedTarget, type PhaseValues } from "./phased";
import { retirementMilestones } from "./retirement";

const a = { ret: 7, cashRet: 3, wd: 4, infl: 2 };

describe("phasedTarget", () => {
  it("no pension → today's formula", () => {
    expect(phasedTarget(30000, 50, a, null)).toBe(targetPotFor(30000, 4));
  });
  it("pension covering spending at stop = pension age → 0", () => {
    expect(phasedTarget(30000, 67, a, { pensionMonthly: 30000, pensionAge: 67, savingsAge: 60, savingsPot: 0 })).toBe(0);
  });
  it("never negative when savings exceed need", () => {
    expect(phasedTarget(20000, 67, a, { pensionMonthly: 25000, pensionAge: 67, savingsAge: 60, savingsPot: 5e6 })).toBe(0);
  });
  it("a pension lowers the target; a bigger pension lowers it more", () => {
    const v = (p: number) => ({ pensionMonthly: p, pensionAge: 67, savingsAge: 60, savingsPot: 0 });
    const none = phasedTarget(30000, 50, a, null);
    expect(phasedTarget(30000, 50, a, v(15000))).toBeLessThan(none);
    expect(phasedTarget(30000, 50, a, v(20000))).toBeLessThan(phasedTarget(30000, 50, a, v(15000)));
  });
  it("savings pot lowers the target", () => {
    const v = (pot: number) => ({ pensionMonthly: 15000, pensionAge: 67, savingsAge: 60, savingsPot: pot });
    expect(phasedTarget(30000, 50, a, v(1e6))).toBeLessThan(phasedTarget(30000, 50, a, v(0)));
  });
  it("stop after both ages collapses to perpetuity minus savings", () => {
    const t = phasedTarget(30000, 70, a, { pensionMonthly: 10000, pensionAge: 67, savingsAge: 60, savingsPot: 1e6 });
    expect(t).toBeCloseTo(targetPotFor(20000, 4) - 1e6, 0);
  });
  it("pension before savings opens uses the second branch", () => {
    const v = { pensionMonthly: 15000, pensionAge: 62, savingsAge: 65, savingsPot: 1e6 };
    const t = phasedTarget(30000, 50, a, v);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(phasedTarget(30000, 50, a, null));
  });
});

describe("monthsToPhasedTarget / milestones", () => {
  const prof = { age: 35, stop: 60, spend: 30000, invested: 500000, cash: 0, saveInvest: 10000, saveCash: 0 };
  const T = targetPotFor(30000, 4);
  it("constant target matches monthsToTarget", () => {
    expect(monthsToPhasedTarget(prof, a, () => T)).toBe(monthsToTarget(prof, a, T));
  });
  it("retirementMilestones with a constant targetAt matches the default", () => {
    expect(retirementMilestones(prof, a, null, () => T)).toEqual(retirementMilestones(prof, a, null));
  });
});

describe("phaseSegments", () => {
  const v = (o: Partial<PhaseValues> = {}): PhaseValues => ({
    pensionMonthly: 15000,
    pensionAge: 67,
    savingsAge: 60,
    savingsPot: 1e6,
    ...o,
  });
  it("stop before both ages → three phases", () => {
    expect(phaseSegments(48, v())).toEqual([
      { from: 48, to: 60, kind: "savings" },
      { from: 60, to: 67, kind: "dps" },
      { from: 67, to: null, kind: "pension" },
    ]);
  });
  it("stop between the ages → two phases", () => {
    expect(phaseSegments(63, v())).toEqual([
      { from: 63, to: 67, kind: "dps" },
      { from: 67, to: null, kind: "pension" },
    ]);
  });
  it("stop after both → pension only", () => {
    expect(phaseSegments(70, v())).toEqual([{ from: 70, to: null, kind: "pension" }]);
  });
  it("savings opening after the pension starts", () => {
    expect(phaseSegments(50, v({ pensionAge: 62, savingsAge: 65 }))).toEqual([
      { from: 50, to: 62, kind: "savings" },
      { from: 62, to: 65, kind: "pension" },
      { from: 65, to: null, kind: "dps" },
    ]);
  });
  it("zero-length phases collapse (both open at the same age, stop exactly at an age)", () => {
    expect(phaseSegments(48, v({ savingsAge: 67 }))).toEqual([
      { from: 48, to: 67, kind: "savings" },
      { from: 67, to: null, kind: "pension" },
    ]);
    expect(phaseSegments(60, v())).toEqual([
      { from: 60, to: 67, kind: "dps" },
      { from: 67, to: null, kind: "pension" },
    ]);
  });
  it("no savings pot or no pension → those phases are left out", () => {
    expect(phaseSegments(48, v({ savingsPot: 0 }))).toEqual([
      { from: 48, to: 67, kind: "savings" },
      { from: 67, to: null, kind: "pension" },
    ]);
    expect(phaseSegments(48, v({ pensionMonthly: 0 }))).toEqual([
      { from: 48, to: 60, kind: "savings" },
      { from: 60, to: null, kind: "dps" },
    ]);
  });
});

import { deriveMetrics, snapshotMetrics } from "./dashboard";
import { PENSION_KEY, pensionDefaults } from "./pension";
import type { PensionLink } from "./phased";
import type { SavedPlan } from "./plan";

describe("dashboard with a pension", () => {
  const plan: SavedPlan = {
    age: 35, stop: 55, spend: 40000, invested: 3e6, cash: 5e5, saveInvest: 20000, saveCash: 5000,
    ret: 7, cashRet: 3, wd: 4, infl: 2, usePension: true,
  };
  const half: PensionLink = {
    birthYear: 1990,
    at: () => ({ pensionMonthly: 20000, pensionAge: 67, savingsAge: 60, savingsPot: 0 }),
  };
  const base = { invest: null, mortgage: null, income: 0 };

  it("pension lowers the target and does not delay living age", () => {
    const off = deriveMetrics({ ...base, plan, pension: null });
    const on = deriveMetrics({ ...base, plan, pension: half });
    expect(on.target!).toBeLessThan(off.target!);
    expect(on.livingAge!).toBeLessThanOrEqual(off.livingAge!);
    expect(on.readiness!).toBeGreaterThan(off.readiness!);
    expect(on.path[0]!.need).toBeLessThan(off.path[0]!.need);
  });
  it("no link, or plan switch off, equals the flat behaviour", () => {
    const off = deriveMetrics({ ...base, plan, pension: null });
    expect(off.target).toBe(targetPotFor(40000, 4));
    expect(deriveMetrics({ ...base, plan: { ...plan, usePension: false }, pension: half }).target).toBe(off.target);
    expect(deriveMetrics({ ...base, plan })).toEqual(off);
  });
  it("snapshotMetrics uses the snapshot's own pension, CZK only", () => {
    const year = new Date().getFullYear();
    const data: Record<string, string> = {
      "finbuddy.profile.v1": JSON.stringify(plan),
    };
    const without = snapshotMetrics(data);
    const withP = { ...data, [PENSION_KEY]: JSON.stringify({ ...pensionDefaults(year), birthYear: year - 35, gross: 60000, grossOverride: true, yearsWorked: 10 }) };
    expect(snapshotMetrics(withP).target!).toBeLessThan(without.target!);
    expect(snapshotMetrics({ ...withP, "finbuddy.currency": "EUR" }).target).toBe(without.target);
  });
});
