import { num } from "./finance";
import { retirementSummary, type PensionScenario } from "./pension";
import {
  potsAfterMonths,
  realMonthlyRate,
  startPot,
  targetPotFor,
  type PlanAssumptions,
  type PlanProfile,
} from "./plan";

/** What the pension side contributes for a given stop age. Ages are fractional years of age. */
export type PhaseValues = {
  /** State pension per month, today's money. */
  pensionMonthly: number;
  /** Age the state pension starts. */
  pensionAge: number;
  /** Age the DPS/DIP savings open. */
  savingsAge: number;
  /** DPS + DIP pot when they open, today's money. */
  savingsPot: number;
};

export type PensionLink = { birthYear: number; at: (stopAge: number) => PhaseValues };

/** Links a saved pension scenario to the Independence maths. Independence always uses the regular pension start. */
export function pensionLinkFrom(
  s: PensionScenario,
  opts: { currentYear: number; salaryGross: number | null },
): PensionLink {
  const cache = new Map<number, PhaseValues>();
  return {
    birthYear: s.birthYear,
    at(stopAge) {
      const key = Math.round(stopAge);
      const hit = cache.get(key);
      if (hit) return hit;
      const r = retirementSummary({ ...s, earlyMonths: 0 }, { ...opts, stopAge: key });
      const v: PhaseValues = {
        pensionMonthly: r.pension.monthly,
        pensionAge: r.pension.startMonths / 12,
        savingsAge: r.savingsOpenMonths / 12,
        savingsPot: r.savingsAtOpen,
      };
      cache.set(key, v);
      return v;
    },
  };
}

/**
 * Pot needed at `stopAge` to fund `spend` per month, counting the state pension and
 * DPS/DIP savings once they start. Everything in today's money.
 */
export function phasedTarget(
  spend: number,
  stopAge: number,
  assumptions: PlanAssumptions,
  v: PhaseValues | null,
): number {
  const wd = assumptions.wd;
  if (v === null) return targetPotFor(spend, wd);
  const g = realMonthlyRate(assumptions.ret, assumptions.infl);
  const PV = (m: number, months: number) => (g === 0 ? m * months : (m * (1 - Math.pow(1 + g, -months))) / g);
  const disc = (x: number, months: number) => x / Math.pow(1 + g, months);

  const Ar = Math.max(stopAge, v.savingsAge);
  const Ap = Math.max(stopAge, v.pensionAge);
  const Cp = targetPotFor(Math.max(0, spend - v.pensionMonthly), wd);

  let target: number;
  if (Ar <= Ap) {
    const gap = (Ap - Ar) * 12;
    const need1 = Math.max(0, PV(spend, gap) + disc(Cp, gap) - v.savingsPot);
    const pre = (Ar - stopAge) * 12;
    target = PV(spend, pre) + disc(need1, pre);
  } else {
    const gap = (Ar - Ap) * 12;
    const need1 = Math.max(0, Cp - disc(v.savingsPot, gap));
    const pre = (Ap - stopAge) * 12;
    target = PV(spend, pre) + disc(need1, pre);
  }
  return Math.max(0, target);
}

/** First month from now where the pot reaches `targetAt(m)`, searching to age 90. null if never. */
export function monthsToPhasedTarget(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  targetAt: (months: number) => number,
): number | null {
  const maxMonths = Math.max(0, Math.round((90 - num(profile.age)) * 12));
  for (let m = 0; m <= maxMonths; m++) {
    const t = targetAt(m);
    if (!isFinite(t)) continue;
    const pot = m === 0 ? startPot(profile) : potsAfterMonths(profile, assumptions, m).total;
    if (pot >= t) return m;
  }
  return null;
}

/** Largest monthly spend the projected pot at the stop age funds, counting the pension. */
export function affordableSpendPhased(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  link: PensionLink,
): number {
  const months = Math.max(0, Math.round((num(profile.stop) - num(profile.age)) * 12));
  const pot = potsAfterMonths(profile, assumptions, months).total;
  const v = link.at(num(profile.stop));
  let lo = 0;
  let hi = 10 * num(profile.spend) + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (phasedTarget(mid, num(profile.stop), assumptions, v) <= pot) lo = mid;
    else hi = mid;
  }
  return lo;
}
