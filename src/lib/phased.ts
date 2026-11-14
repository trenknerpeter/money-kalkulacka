import { num } from "./finance";
import { retirementSummary, type PensionScenario } from "./pension";
import {
  potAtStop,
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

/**
 * Why the state pension starts late: with 20–34 insured years it starts 5 years after the
 * statutory age (35 are needed to get it on time).
 */
export type PensionDelay = {
  /** Whole insured years when work stops. */
  insuredYears: number;
  /** Statutory age, fractional years. */
  statutoryAge: number;
  /** Age the delayed pension starts. */
  startAge: number;
  /** Earliest whole stop age that gets the pension at the statutory age; null if none does. */
  onTimeStop: number | null;
};

export type PensionLink = {
  birthYear: number;
  at: (stopAge: number) => PhaseValues;
  /** Non-null when stopping at this age delays the state pension. */
  delayAt: (stopAge: number) => PensionDelay | null;
};

/**
 * While the pension is used, the Retirement tab's birth year is the single source of truth
 * for the plan's current age. A stop age that is no longer ahead moves to the next year.
 */
export function withPensionAge<T extends { age: number; stop: number }>(
  plan: T,
  birthYear: number,
  currentYear: number,
): T {
  const age = currentYear - birthYear;
  return { ...plan, age, stop: Math.max(num(plan.stop), age + 1) };
}

/** Links a saved pension scenario to the Independence maths. Independence always uses the regular pension start. */
export function pensionLinkFrom(
  s: PensionScenario,
  opts: { currentYear: number; salaryGross: number | null },
): PensionLink {
  const cache = new Map<number, PhaseValues>();
  const pensionAt = (stopAge: number) =>
    retirementSummary({ ...s, earlyMonths: 0 }, { ...opts, stopAge: Math.round(stopAge) }).pension;
  return {
    birthYear: s.birthYear,
    delayAt(stopAge) {
      const p = pensionAt(stopAge);
      if (!p.delayed) return null;
      const statutoryAge = p.statutoryMonths / 12;
      let onTimeStop: number | null = null;
      for (let age = Math.round(stopAge) + 1; age <= Math.ceil(statutoryAge); age++) {
        const q = pensionAt(age);
        if (q.eligible && !q.delayed) {
          onTimeStop = age;
          break;
        }
      }
      return { insuredYears: p.insuredYears, statutoryAge, startAge: p.startMonths / 12, onTimeStop };
    },
    at(stopAge) {
      const key = Math.round(stopAge);
      const hit = cache.get(key);
      if (hit) return hit;
      const r = retirementSummary({ ...s, earlyMonths: 0 }, { ...opts, stopAge: key });
      // The pots join when they open, or at the stop age if that is later — with the
      // contributions and growth up to then (contributions end at the stop age).
      const joinMonths = Math.max(r.savingsOpenMonths, key * 12);
      const v: PhaseValues = {
        pensionMonthly: r.pension.monthly,
        pensionAge: r.pension.startMonths / 12,
        savingsAge: joinMonths / 12,
        savingsPot: (r.dps?.atMonths(joinMonths) ?? 0) + (r.dip?.atMonths(joinMonths) ?? 0),
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

/**
 * Nominal investment return needed for the pot at the stop age to meet the phased target
 * at the stop age. The target itself depends on the return, so it is recomputed at every
 * step. null with no time left, or if even 15% is not enough.
 */
export function requiredReturnPhased(
  profile: PlanProfile,
  assumptions: PlanAssumptions,
  link: PensionLink,
): number | null {
  const stop = num(profile.stop);
  if (Math.round((stop - num(profile.age)) * 12) <= 0) return null;
  const v = link.at(stop);
  const surplus = (ret: number) => {
    const a = { ...assumptions, ret };
    return potAtStop(profile, a) - phasedTarget(num(profile.spend), stop, a, v);
  };
  if (!(surplus(15) >= 0)) return null;
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (surplus(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type PhaseSegment = { from: number; to: number | null; kind: "savings" | "dps" | "pension" };

/**
 * Who pays for what, from the stop age on. "savings" = your own money pays everything,
 * "dps" = DPS/DIP have opened too, "pension" = the state pension has started.
 * Zero-length phases are left out; the last phase is open-ended (`to` null).
 * A phase whose source does not exist (no DPS/DIP pot, no state pension) is left out.
 */
export function phaseSegments(stopAge: number, v: PhaseValues): PhaseSegment[] {
  const A = v.savingsPot > 0 ? Math.max(stopAge, v.savingsAge) : Infinity;
  const P = v.pensionMonthly > 0 ? Math.max(stopAge, v.pensionAge) : Infinity;
  const events: { at: number; kind: "dps" | "pension" }[] = [];
  if (isFinite(A)) events.push({ at: A, kind: "dps" });
  if (isFinite(P)) events.push({ at: P, kind: "pension" });
  events.sort((x, y) => x.at - y.at);

  const out: PhaseSegment[] = [];
  let from = stopAge;
  let kind: PhaseSegment["kind"] = "savings";
  const push = (to: number | null) => {
    if (to === null || to - from > 1e-9) out.push({ from, to, kind });
  };
  for (const e of events) {
    push(e.at);
    from = e.at;
    kind = e.kind;
  }
  push(null);
  return out;
}
