# Retirement tab + Plan → Independence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Czech Retirement tab (state pension, DPS, DIP), and turn Plan into "Independence". Independence gets an intro screen and can optionally use Retirement's numbers in a phased target.

**Architecture:**
- All rules and maths are pure functions:
  - `src/lib/pension.ts`: Czech pension, DPS and DIP. Unit-tested like `salary.ts`.
  - `src/lib/phased.ts`: the phased Independence target. Unit-tested.
- UI:
  - The new `/duchod` route uses the Mzda tab's live-form layout and `useScenario`.
  - `src/routes/plan.tsx` gains an intro screen, a 6th questionnaire step, and the phased target in Results.
  - The dashboard reuses the same target function.

**Tech Stack:** TanStack Start (file routes in `src/routes`), React, TypeScript, Tailwind, vitest (`npm test`).

**Spec:** `docs/superpowers/specs/2026-11-12-retirement-and-independence-design.md`. Read it first. Rule values and copy come from it.

## Global Constraints

- **Branch:**
  - Work on a new branch `feature/retirement-independence`, never on `main`. Pushing `main` syncs to Lovable.
  - Never force-push or rewrite pushed history (AGENTS.md).
- **Uncommitted work:** the working tree has the user's uncommitted analytics changes (`src/lib/analytics.tsx`, `useScenario.ts`, `AppShell.tsx`, …). Don't revert or commit them. Before Task 1, ask the user to commit or stash them, or confirm they can travel along uncommitted.
- **Money:** everything is in today's money. Inflation defaults to 2%. Use `realMonthlyRate` from `src/lib/plan.ts` for real growth.
- **Pension and DPS amounts** are always CZK. If the app currency ≠ CZK, `/duchod` shows the same notice pattern as `src/routes/mzda.tsx:254`, and Independence hides the pension step and treats `usePension` as off.
- **i18n:** every user-visible string goes through `t()` with an English key and a Czech entry in `src/lib/i18n.tsx`.
- **Rule values (2026, verbatim from the spec):**
  - základní výměra 4,900
  - minimum procentní výměra 4,900
  - RH1 21,546 and RH2 195,868
  - upper band 26%
  - výchovné 500 per child
  - average wage 48,967
  - first-band rate 99% in 2026, −1 percentage point a year, floor 90% from 2035
  - percentage per insured year 1.495% in 2026, −0.005 percentage points a year, floor 1.450% from 2035
- **Rounding:** výpočtový základ and procentní výměra round up to whole Kč (`Math.ceil`).
- **DPS:**
  - State contribution = 0 if own < 500; otherwise 20% × min(own, 1,700).
  - No state contribution on employer money or after the pension starts.
- **DPS/DIP opening:** age 60 and ≥120 months saved. DPS contracts started before 2024 need only ≥60 months.
- **Tax line:** 15% × min(48,000, max(0, own DPS − 1,700) × 12 + own DIP × 12).
- **Default nominal returns:** DPS conservative 2, balanced 4, dynamic 7. DIP 7.

## Review Focus

1. **Birth year outside 1961…(current year − 18), or "years worked" greater than age − 15.** Clamp in `normalisePension`. Never produce NaN or a negative pension. Test in Task 3.
2. **Stop age at or after the statutory age, or after DPS/DIP opening.** The phases collapse cleanly, and the target equals the simple formula minus what's already available. Test in Task 4.
3. **The pension alone covers spending (spend − pension ≤ 0).** The target never goes negative, and "You could stop working now" still works. Test in Task 4.
4. **Currency switched to EUR after linking the pension in Independence.** The pension is ignored and the results don't break or mix CZK pension with EUR spending. Test in Task 8 (UI check).
5. **A shared Independence link with `usePension=1` and no `p_` params, e.g. an old link.** Fall back to stored pension data, else pension off, without crashing. Test in Task 3 (`pensionFromParams` returns null) and Task 8.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/pension.ts` (new) | Rules object, statutory age, state pension, DPS/DIP projection, tax line, scenario type, load/normalise, URL params, `retirementSummary` |
| `src/lib/pension.test.ts` (new) | Rule tests |
| `src/lib/phased.ts` (new) | `pensionLinkFrom`, `phasedTarget`, `monthsToPhasedTarget`, `affordableSpendPhased` |
| `src/lib/phased.test.ts` (new) | Phased-target tests |
| `src/lib/plan.ts` | `usePension` on `SavedPlan` |
| `src/lib/retirement.ts` | `retirementMilestones` accepts an optional target function |
| `src/lib/dashboard.ts` | `deriveMetrics` takes an optional pension link |
| `src/routes/duchod.tsx` (new) | Retirement tab UI |
| `src/routes/plan.tsx` | Intro, step labels, pension step, phased Results |
| `src/components/plan/PlanChart.tsx` | Vertical age markers |
| `src/components/AppShell.tsx`, `src/routes/index.tsx` | Nav, homepage cards, journey |
| `src/routes/dashboard.tsx` | Pension link + Retirement summary block |
| `src/lib/snapshots.ts`, `src/lib/seoContent.ts`, `public/sitemap.xml`, `src/lib/i18n.tsx` | Keys, SEO, sitemap, strings |

---

### Task 1: Statutory retirement age and the rules object

**Files:**
- Create: `src/lib/pension.ts`
- Test: `src/lib/pension.test.ts`

**Interfaces:**
- Produces:
  - `type PensionRules = { year: number; basic: number; minPercent: number; rh1: number; rh2: number; upperRate: number; perChild: number; averageWage: number }`
  - `const CZ_PENSION_2026: PensionRules`
  - `firstBandRate(pensionYear: number): number`, returns a fraction such as 0.99
  - `yearRate(pensionYear: number): number`, returns a fraction such as 0.01495
  - `statutoryAgeMonths(birthYear: number, female: boolean, children: number): number`, returns age in months

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run `npx vitest run src/lib/pension.test.ts`.** Expected: FAIL (module not found).
- [ ] **Step 3: Implement in `src/lib/pension.ts`.**
  - Encode the spec's 1961–1972 table as `Record<number, [m, w1, w2, w34, w5]>` in months, with men = W0 = the first column.
  - Birth years before 1961 clamp to 1961.
  - Add a header comment citing act 155/1995 Sb. (as amended by 270/2023 and 417/2024) and decree 365/2025 Sb.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(pension): statutory retirement age and 2026 rules`.

### Task 2: State pension estimate

**Files:**
- Modify: `src/lib/pension.ts`
- Test: `src/lib/pension.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:

```ts
type StatePensionInput = {
  birthYear: number; female: boolean; children: number;
  gross: number;          // today's monthly gross, CZK
  yearsWorked: number;    // insured years so far
  workUntilAge: number;   // age (years) earnings and insurance stop; ≥ statutory → work to statutory
  earlyMonths: number;    // 0–36, early pension; 0 = none
  currentYear: number;
};
type StatePensionResult = {
  eligible: boolean;           // ≥20 insured years
  delayed: boolean;            // 20–34 years → starts 60 months after statutory
  statutoryMonths: number;     // from statutoryAgeMonths
  startMonths: number;         // age in months the pension actually starts
  startYear: number;           // birthYear + floor(startMonths / 12)
  insuredYears: number;        // floor
  base: number;                // diluted gross
  calcBase: number;            // výpočtový základ, ceil
  basic: number;               // 4,900 (0 if not eligible)
  percent: number;             // procentní výměra incl. výchovné, after floor and early cut
  earlyAllowed: boolean;       // insured years at the early start ≥ 40
  earlyCut: number;            // Kč a month removed by the early pension
  monthly: number;             // basic + percent; 0 if not eligible
};
statePension(i: StatePensionInput, rules?: PensionRules): StatePensionResult
```

**Algorithm.** The test values below are not determined by the signature alone, so the order of operations is fixed here:
1. currentAge = currentYear − birthYear.
2. firstJobAge = currentAge − yearsWorked.
3. statY = statutoryMonths / 12.
4. stopY = min(workUntilAge, statY − earlyMonths/12, when the early pension is used).
5. insuredYears = floor(yearsWorked + max(0, stopY − currentAge)).
6. Dilution ratio = min(1, insuredYears / max(1, statY − firstJobAge)). base = gross × ratio.
7. Eligibility:
   - insuredYears < 20: not eligible, monthly 0.
   - insuredYears < 35: delayed, startMonths = statutoryMonths + 60. The early pension is not allowed.
8. The early pension is honoured only if `earlyMonths > 0`, not delayed, and insuredYears ≥ 40. Otherwise set `earlyAllowed=false` and ignore it. With it, startMonths = statutoryMonths − earlyMonths.
9. calcBase = ceil(firstBandRate(startYear) × min(base, rh1) + 0.26 × clamp(base − rh1, 0, rh2 − rh1)).
10. raw = calcBase × yearRate(startYear) × insuredYears.
11. Early cut:
    - blocks = ceil(earlyMonths × 30.4167 / 90).
    - cut = calcBase × blocks × (insuredYears ≥ 45 ? 0.0075 : 0.015).
12. percent = ceil(max(4,900, raw − cut)) + 500 × children.
13. earlyCut = ceil(raw) − (percent − 500 × children), reported as ≥ 0.

- [ ] **Step 1: Write the failing tests**

```ts
const p = { birthYear: 1991, female: false, children: 0, gross: 48967, yearsWorked: 12, workUntilAge: 99, earlyMonths: 0, currentYear: 2026 };
it("spec sanity example: average wage, 44 years, pension in 2058 → 21,821", () => {
  const r = statePension(p);
  expect(r.startYear).toBe(2058);
  expect(r.insuredYears).toBe(44);
  expect(r.calcBase).toBe(26521);
  expect(r.monthly).toBe(21821);
});
it("stopping at 48 dilutes the base and delays the pension 5 years", () => {
  const r = statePension({ ...p, workUntilAge: 48 });
  expect(r.insuredYears).toBe(25);
  expect(r.base).toBeCloseTo(48967 * 25 / 44, 0);
  expect(r.delayed).toBe(true);
  expect(r.startMonths).toBe(804 + 60);
  expect(r.calcBase).toBe(21024);
  expect(r.monthly).toBe(4900 + 7622);
});
it("eligibility at 35 / 34 / 20 / 19 insured years", () => {
  // currentAge 35, statutory 67 → working to statutory adds 32 years; insured = yearsWorked + 32
  const full = (years: number) => statePension({ ...p, yearsWorked: years - 32 });
  // stopping early with no prior years: insured = workUntil − 35
  const stop = (years: number) => statePension({ ...p, yearsWorked: 0, workUntilAge: 35 + years });
  expect(full(35).delayed).toBe(false);
  expect(full(34).delayed).toBe(true);
  expect(stop(20)).toMatchObject({ eligible: true, delayed: true });
  expect(stop(19)).toMatchObject({ eligible: false, monthly: 0 });
});
it("low earner gets the 4,900 percentage floor → 9,800", () => {
  expect(statePension({ ...p, gross: 5000 }).monthly).toBe(9800);
});
it("children add 500 each", () => {
  expect(statePension({ ...p, children: 2 }).monthly).toBe(21821 + 1000);
});
it("early pension 36 months: 13 blocks × 1.5 % of the calculation base", () => {
  const r = statePension({ ...p, earlyMonths: 36 });
  expect(r.earlyAllowed).toBe(true);
  expect(r.startMonths).toBe(804 - 36);
  expect(r.monthly).toBeLessThan(21821);
  expect(r.earlyCut).toBe(Math.ceil(r.calcBase * 0.0145 * r.insuredYears) - Math.ceil(r.calcBase * 0.0145 * r.insuredYears - r.calcBase * 13 * 0.015));
});
it("early pension refused under 40 insured years", () => {
  const r = statePension({ ...p, yearsWorked: 0, earlyMonths: 36 });
  expect(r.earlyAllowed).toBe(false);
  expect(r.startMonths).toBe(804);
});
```

- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `statePension` following the algorithm above.**
- [ ] **Step 4: Run the tests.** Expected: PASS. If the 25-year or the sanity values differ by 1 Kč, recheck the ceil placement against steps 9–12 and don't edit the expected values.
- [ ] **Step 5: Commit** `feat(pension): state pension estimate with dilution, eligibility and early pension`.

### Task 3: DPS/DIP, tax line, scenario storage and summary

**Files:**
- Modify: `src/lib/pension.ts`
- Test: `src/lib/pension.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `realMonthlyRate`, `potAfterMonths` from `./plan`; `Source` type from `./dashboard`.
- Produces:

```ts
dpsStateContribution(own: number): number
potOpenMonths(birthYear: number, startYear: number, kind: "dps" | "dip"): number   // age in months
type PotProjection = { openMonths: number; atOpen: number; atMonths: (ageMonths: number) => number; paidIn: number; employer: number; state: number; growth: number }
projectPot(pot: { balance: number; own: number; employer: number; startYear: number; ret: number }, kind: "dps" | "dip",
  ctx: { birthYear: number; currentYear: number; contributeUntilMonths: number /* age in months */; infl: number }): PotProjection
drawdownMonthly(pot: number, years: number, realAnnualPct: number): number
taxSaving(ownDps: number, ownDip: number): number          // Kč a year

type PensionScenario = {   // flat scalars for useScenario
  birthYear: number; female: boolean; children: number;
  gross: number; grossOverride: boolean; yearsWorked: number;
  workUntil: number;      // 0 = statutory age
  earlyMonths: number;    // 0–36
  dpsBalance: number; dpsOwn: number; dpsEmployer: number; dpsStart: number; dpsRet: number;
  dipBalance: number; dipOwn: number; dipEmployer: number; dipStart: number; dipRet: number;
  drawYears: number;      // 10–30, default 20
  infl: number;           // default 2
};
const PENSION_KEY = "finbuddy.pension.v1"
pensionDefaults(currentYear: number): PensionScenario  // birthYear currentYear−35, gross 48967, yearsWorked 13, dps/dip start currentYear, dpsRet 4, dipRet 7, drawYears 20, infl 2, rest 0/false
normalisePension(raw: Partial<PensionScenario>, currentYear: number): PensionScenario
loadPension(get?: Source): PensionScenario | null       // null when nothing stored
pensionToParams(s: PensionScenario): Record<string, string>      // keys prefixed "p_"
pensionFromParams(params: URLSearchParams, currentYear: number): PensionScenario | null  // null without p_birthYear
resolveGross(s: PensionScenario, salaryGross: number | null): number   // override ? s.gross : salaryGross ?? s.gross

type RetirementSummary = {
  currentAge: number; pension: StatePensionResult;
  dps: PotProjection | null; dip: PotProjection | null;   // null when balance, own and employer are all 0
  savingsOpenMonths: number;        // later of the two open ages (0 if none)
  savingsAtOpen: number;            // both pots at savingsOpenMonths
  savingsAtPension: number;         // both pots at pension.startMonths
  drawdown: number;                 // drawdownMonthly(savingsAtPension, drawYears, real return of the larger pot)
  totalMonthly: number;             // pension.monthly + drawdown
  taxSaving: number;
};
retirementSummary(s: PensionScenario, opts: { currentYear: number; salaryGross: number | null; stopAge?: number }): RetirementSummary
```

Rules for `projectPot`:
- Months run from now to `atMonths`, using the real monthly rate from `ret`/`infl`.
- Contributions run until `contributeUntilMonths`:
  - own + employer every month
  - plus `dpsStateContribution(own)` for DPS only
- `stopAge` in `retirementSummary` sets `contributeUntilMonths` and `workUntilAge`. Without it, use `s.workUntil || statutory`.
- `paidIn`, `employer` and `state` are nominal sums up to `openMonths`; growth = atOpen − the three − balance.

`normalisePension` clamps:
- birthYear to [1961, currentYear − 18]
- yearsWorked to [0, currentAge − 15]
- children to [0, 10]
- earlyMonths to [0, 36]
- drawYears to [10, 30]
- money fields to ≥ 0
- rates to [0, 15]

- [ ] **Step 1: Write the failing tests**

```ts
it("DPS state contribution steps", () => {
  expect([499, 500, 1000, 1700, 3000].map(dpsStateContribution)).toEqual([0, 100, 200, 340, 340]);
});
it("open age: pre-2024 DPS at 60, 2024+ DPS needs 120 months", () => {
  expect(potOpenMonths(1991, 2020, "dps")).toBe(720);
  expect(potOpenMonths(1991, 2055, "dps")).toBe((64 + 10) * 12);
  expect(potOpenMonths(1991, 2055, "dip")).toBe((64 + 10) * 12);
  expect(potOpenMonths(1991, 2026, "dip")).toBe(720);
});
it("tax line", () => {
  expect(taxSaving(2000, 3000)).toBe(5940);
  expect(taxSaving(5700, 0)).toBe(7200);
  expect(taxSaving(10000, 10000)).toBe(7200);
});
it("drawdown at 0 % real: 1.2M over 20 years → 5,000", () => {
  expect(drawdownMonthly(1_200_000, 20, 0)).toBeCloseTo(5000, 6);
});
it("projectPot at 0 % real equals balance + contributions", () => {
  const r = projectPot({ balance: 10000, own: 1000, employer: 500, startYear: 2020, ret: 2 }, "dps",
    { birthYear: 1991, currentYear: 2026, contributeUntilMonths: 36 * 12, infl: 2 });
  expect(r.openMonths).toBe(720);
  expect(r.paidIn).toBe(12000);
  expect(r.employer).toBe(6000);
  expect(r.state).toBe(2400);
  expect(r.atOpen).toBeCloseTo(10000 + 12000 + 6000 + 2400, 0);
});
it("normalisePension clamps nonsense", () => {
  const s = normalisePension({ birthYear: 1900, yearsWorked: 80, children: -2, dpsOwn: -5 }, 2026);
  expect(s.birthYear).toBe(1961);
  expect(s.yearsWorked).toBe(2026 - 1961 - 15);
  expect(s.children).toBe(0);
  expect(s.dpsOwn).toBe(0);
  expect(Number.isFinite(retirementSummary(s, { currentYear: 2026, salaryGross: null }).totalMonthly)).toBe(true);
});
it("params round-trip and missing params → null", () => {
  const s = pensionDefaults(2026);
  expect(pensionFromParams(new URLSearchParams(pensionToParams(s)), 2026)).toEqual(s);
  expect(pensionFromParams(new URLSearchParams("usePension=1"), 2026)).toBeNull();
});
it("resolveGross follows Salary unless overridden", () => {
  const s = pensionDefaults(2026);
  expect(resolveGross(s, 60000)).toBe(60000);
  expect(resolveGross({ ...s, grossOverride: true, gross: 30000 }, 60000)).toBe(30000);
  expect(resolveGross(s, null)).toBe(48967);
});
it("summary stops contributions at stopAge", () => {
  const s = { ...pensionDefaults(2026), birthYear: 1991, dpsOwn: 1000 };
  const a = retirementSummary(s, { currentYear: 2026, salaryGross: null });
  const b = retirementSummary(s, { currentYear: 2026, salaryGross: null, stopAge: 45 });
  expect(b.savingsAtOpen).toBeLessThan(a.savingsAtOpen);
  expect(b.pension.monthly).toBeLessThan(a.pension.monthly);
});
```

- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement the functions listed in Interfaces.**
  - `drawdownMonthly` is an annuity payment at the real monthly rate; at r = 0 it's pot / months.
  - `loadPension` reads `PENSION_KEY` with the same try/catch pattern as `loadInvest`.
- [ ] **Step 4: Run `npm test`.** Expected: all PASS, including the existing suites.
- [ ] **Step 5: Commit** `feat(pension): DPS/DIP projection, tax line, scenario storage and summary`.

### Task 4: Phased Independence target

**Files:**
- Create: `src/lib/phased.ts`
- Test: `src/lib/phased.test.ts`
- Modify: `src/lib/plan.ts`:
  - `SavedPlan` gets `usePension: boolean`
  - `normalisePlan` reads `usePension` (true for `1`/`true`, default false)
- Modify: `src/lib/retirement.ts`:
  - `retirementMilestones(profile, assumptions, schedule, targetAt?: (months: number) => number)`
  - When given, milestone 1 uses `monthsToPhasedTarget` and milestone 2 compares against `targetAt(m) + debt`.

**Interfaces:**
- Consumes: `retirementSummary`, `PensionScenario` (Task 3); `PlanProfile`, `PlanAssumptions`, `potsAfterMonths`, `realMonthlyRate`, `targetPotFor` from `./plan`.
- Produces:

```ts
type PhaseValues = { pensionMonthly: number; pensionAge: number; savingsAge: number; savingsPot: number }  // ages in years (fractional)
type PensionLink = { birthYear: number; at: (stopAge: number) => PhaseValues }
pensionLinkFrom(s: PensionScenario, opts: { currentYear: number; salaryGross: number | null }): PensionLink
  // at(stop) = retirementSummary(s, { ..., stopAge: stop }) with early pension forced to 0; memoised by rounded stop age
phasedTarget(spend: number, stopAge: number, assumptions: PlanAssumptions, v: PhaseValues | null): number
monthsToPhasedTarget(profile: PlanProfile, assumptions: PlanAssumptions, targetAt: (months: number) => number): number | null
affordableSpendPhased(profile: PlanProfile, assumptions: PlanAssumptions, link: PensionLink): number
```

**Algorithm for `phasedTarget`.** This one is not determined by the signature:

```
if v === null → targetPotFor(spend, wd)
g  = real monthly rate of assumptions.ret/infl;  PV(m, months) = m × (1 − (1+g)^−months)/g  (g=0 → m × months)
disc(x, months) = x / (1+g)^months
A_r = max(stopAge, v.savingsAge);  A_p = max(stopAge, v.pensionAge)
Cp  = targetPotFor(max(0, spend − v.pensionMonthly), wd)          // needed at A_p, forever after
if A_r <= A_p:   // savings open first (usual case)
  need1 = max(0, PV(spend, (A_p − A_r)·12) + disc(Cp, (A_p − A_r)·12) − v.savingsPot)   // at A_r
  target = PV(spend, (A_r − stopAge)·12) + disc(need1, (A_r − stopAge)·12)
else:            // pension starts before savings open
  need1 = max(0, Cp − disc(v.savingsPot, (A_r − A_p)·12))                                // at A_p
  target = PV(spend, (A_p − stopAge)·12) + disc(need1, (A_p − stopAge)·12)
return max(0, target)
```

`monthsToPhasedTarget`: the first m in 0…(90 − age)×12 where `potsAfterMonths(profile, assumptions, m).total >= targetAt(m)`; null if none. It mirrors `monthsToTarget`.

`affordableSpendPhased`: bisection on spend in [0, 10 × profile.spend + 1] for the largest spend with `phasedTarget(spend, profile.stop, …) <= potAtStop`.

- [ ] **Step 1: Write the failing tests**

```ts
const a = { ret: 7, cashRet: 3, wd: 4, infl: 2 };
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
it("monthsToPhasedTarget with a constant target matches monthsToTarget", () => {
  const prof = { age: 35, stop: 60, spend: 30000, invested: 500000, cash: 0, saveInvest: 10000, saveCash: 0 };
  const T = targetPotFor(30000, 4);
  expect(monthsToPhasedTarget(prof, a, () => T)).toBe(monthsToTarget(prof, a, T));
});
it("retirementMilestones with a constant targetAt matches the default", () => {
  const prof = { age: 35, stop: 60, spend: 30000, invested: 500000, cash: 0, saveInvest: 10000, saveCash: 0 };
  const T = targetPotFor(30000, 4);
  expect(retirementMilestones(prof, a, null, () => T)).toEqual(retirementMilestones(prof, a, null));
});
```

- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `phased.ts`, the `plan.ts` field and the optional `retirementMilestones` parameter.**
- [ ] **Step 4: Run `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(plan): phased target with state pension and DPS/DIP`.

### Task 5: Retirement tab `/duchod`

**Files:**
- Create: `src/routes/duchod.tsx`
- Modify:
  - `src/lib/seoContent.ts`: add `"duchod"` to `SeoPage`, plus cs/en heading, article and FAQ with ≥4 Q&As, e.g. "Kdy půjdu do důchodu?", "Kolik budu mít důchod?", "Kolik dává stát na penzijní spoření?", "Jaký je rozdíl mezi DPS a DIP?".
  - `public/sitemap.xml`: add `/duchod`.
  - `src/lib/snapshots.ts`: add `"finbuddy.pension.v1"` to `SNAPSHOT_KEYS`.
  - `src/lib/i18n.tsx`: add the strings.

**Interfaces:**
- Consumes: `PensionScenario`, `pensionDefaults`, `PENSION_KEY`, `retirementSummary`, `resolveGross`, `taxSaving`, `statutoryAgeMonths` (Tasks 1–3); `useScenario`, `NumberSlider`, `Panel`, `Switch`, `Accordion`, `CopyLinkButton`, `SeoArticle`, the `canonical`/`webAppLd`/`faqLd` helpers; `parseSalaryStore(localStorage.getItem(SALARY_KEY))?.gross ?? null` for the live salary.
- Produces: route `/duchod`.

- [ ] **Step 1: Build the route following `src/routes/mzda.tsx`'s structure.**
  - **Head:** title "Důchodová kalkulačka 2026 — Money Kalkulačka". Add a matching description, `webAppLd`, and `faqLd(SEO_CONTENT.duchod.cs.faq)`.
  - **Left panel** (inputs from spec Part 1):
    - Birth year.
    - Female switch, shown only if birthYear ≤ 1972.
    - Children.
    - Gross:
      - Shows the "From your Salary tab" label when not overridden.
      - Editing sets `grossOverride: true`.
      - "Different from your Salary tab · reset" clears it.
    - Years worked.
    - Work until (0 = statutory).
    - Collapsible DPS and DIP sections, open when they have any value:
      - DPS has a three-button strategy picker that sets `dpsRet` to 2/4/7, plus a return slider.
  - **Right side** (results 1–7 from the spec):
    - Headline age as "X years Y months — in YYYY".
    - Pension card with a breakdown accordion (base, calculation base, basic, percentage, výchovné, insured years, "Years without income lower your average.").
    - ČSSZ link `https://www.cssz.gov.cz/duchodova-kalkulacka`.
    - Savings card with the paid-in / employer / state / growth split, open age, value at pension age, and a `drawYears` slider.
    - Total monthly income.
    - Tax line.
    - Early-pension slider 0–36 months, disabled with the reason when `!earlyAllowed`.
    - Eligibility warnings for delayed / not eligible.
    - CTA link to `/plan`.
  - **Non-CZK notice** like `mzda.tsx:254`.
- [ ] **Step 2: Run `npm run build` and `npm test`.** Expected: both succeed.
- [ ] **Step 3: Verify in the preview** (`preview_start`):
  - Open `/duchod` with defaults. With an average salary and birth year 1991 the pension shows ≈ 21,8xx Kč.
  - Set "Work until" 48. Expect the "starts 5 years later" warning.
  - Switch the language to EN. Every string is translated.
  - Check at 375px width: no horizontal scroll.
- [ ] **Step 4: Commit** `feat: Retirement tab (/duchod)`.

### Task 6: Navigation, homepage and rename to Independence

**Files:**
- Modify:
  - `src/components/AppShell.tsx` `TABS`: Salary, Retirement (`/duchod`), Invest, Mortgage, Independence (`/plan`), Dashboard.
  - `src/routes/index.tsx` `CARDS`/`JOURNEY`: add a Retirement card after Salary with subtitle "When you'll retire, your state pension and what DPS and DIP add.", and reuse an existing visual or add a simple one in `Illustrations.tsx`. Retitle the Plan card "Independence".
  - `src/routes/plan.tsx` head:
    - Title "Cesta k finanční nezávislosti — Money Kalkulačka".
    - Keep the description's "kdy můžete přestat pracovat" framing.
  - `src/lib/seoContent.ts`: plan heading, and the FAQ answer to "Does the plan include the state pension?" (cs+en): "Optionally. If you fill in the Retirement tab, the plan counts your state pension and DPS/DIP from the age they start. Otherwise it shows when your own money alone is enough."
  - `src/routes/dashboard.tsx`: user-facing "Plan" labels → "Independence" (e.g. "Answer the plan questions →" → "Start your independence plan →").
  - `src/lib/i18n.tsx`: `Retirement: "Důchod"` and `Independence: "Nezávislost"`.

- [ ] **Step 1: Make the edits.**
- [ ] **Step 2: Run `npm run build`.** Expected: success.
- [ ] **Step 3: Check the preview at 375px and desktop.** All six tabs are reachable; the nav scrolls horizontally on mobile without page overflow. Take a screenshot.
- [ ] **Step 4: Commit** `feat: Retirement in nav and homepage; Plan renamed to Independence`.

### Task 7: Independence intro screen and step labels

**Files:**
- Modify: `src/routes/plan.tsx`. In `PlanPage`, an `intro` state is true when there's no saved plan and no URL plan. Add a new `Intro` component in the same file, and add the progress label to `Questionnaire`.

**Interfaces:**
- Consumes: `loadInvest`, `loadPension`.
- Produces: `function Intro({ onStart }: { onStart: () => void })`. Each step in `STEPS` gets a short `label` field (Age, Stop age, Spending, Investments, Savings, Pension).

- [ ] **Step 1: Implement `Intro` with the spec's copy.**
  - Eyebrow "Cesta k finanční nezávislosti", h1 "Kdy můžete přestat pracovat?" (English keys "Path to financial independence" and "When can you stop working?").
  - Three outcome tiles with small inline previews: the age you can stop; how big your pot needs to be; what to change if you're short.
  - "{n} questions · about 2 minutes · everything in today's money · stays in your browser".
  - When `loadInvest()` or `loadPension()` is non-null: "We'll pre-fill from your Invest and Retirement tabs" (name only the tabs that have data).
  - Primary button "Work out my plan".
  - Secondary link "Only want your state pension? → Retirement tab" to `/duchod`.
- [ ] **Step 2: Replace the progress dots.** Show "Step {i} of {n} · {label}" and keep the dots underneath. `n` excludes the pension step when the currency ≠ CZK.
- [ ] **Step 3: Verify in the preview.**
  - Clear `finbuddy.profile.v1` and open `/plan`. The intro shows; Start leads to step 1.
  - A saved plan still opens straight on Results.
  - A shared link with `?age=…&stop=…` skips the intro.
- [ ] **Step 4: Commit** `feat(plan): intro screen and step labels`.

### Task 8: Pension step, age pre-fill, double-count copy and share links

**Files:**
- Modify: `src/routes/plan.tsx`, which covers `Questionnaire`, `PlanPage`, the URL mirroring in `Results` (lines ~544–564), and the `STEPS` investment helper.

**Interfaces:**
- Consumes: `loadPension`, `pensionFromParams`, `pensionToParams`, `retirementSummary`, `pensionLinkFrom` (Tasks 3–4); `useCurrency`.
- Produces: the plan's `usePension` gets set. `PlanPage` resolves `pension: PensionScenario | null`:
  - URL `p_*` params first, else `loadPension()`.
  - It is passed to `Results` as a prop `pension`.
  - It is forced to null when the currency ≠ CZK.

- [ ] **Step 1: Add the 6th step "Pension & retirement savings"**, a non-numeric step with no `fields`. It is skipped when the currency ≠ CZK.
  - **With pension data:** a card "Retirement tab: state pension ~{p} from {age}; DPS + DIP ~{pot} from {openAge}", with a "Use these" / "Using these" toggle. Compute the values with `retirementSummary(pension, { currentYear, salaryGross, stopAge: answers.stop })`.
  - **Without:** the copy "Add your state pension and DPS/DIP to lower what you need to save.", a link button to `/duchod`, and a secondary "Skip — count on my own money only".
  - A reminder line: "Make sure DPS and DIP aren't in your investments above." It links back to the investments step.
  - `onDone` saves `usePension`.
- [ ] **Step 2: Pre-fill the age** on a first visit when pension data exists: `age = currentYear − pension.birthYear`.
- [ ] **Step 3: Change the investments step helper text** when pension data exists: "Funds, shares, ETFs — money that's in the market. Leave out DPS and DIP — they're counted from your Retirement tab." Otherwise keep the current text but drop "pension pots".
- [ ] **Step 4: Share links.** When `usePension` is on, the Results URL mirroring adds `usePension=1` and `pensionToParams(pension)`.
  - `PlanPage` reads them via `pensionFromParams` without writing them to `finbuddy.pension.v1`.
  - With `usePension=1` but no `p_` params and no stored pension, treat the pension as off (Review Focus 5).
- [ ] **Step 5: Verify in the preview.**
  - Fill in `/duchod`, then go through `/plan` and use the pension. The URL contains `p_birthYear`.
  - Open that URL in a fresh tab with storage cleared; the result is the same.
  - Switch the currency to EUR; the pension step disappears and the results don't use the pension (Review Focus 4).
  - `/plan?age=35&stop=60&usePension=1` with nothing stored doesn't crash.
- [ ] **Step 6: Commit** `feat(plan): pension step, age pre-fill and pension share links`.

### Task 9: Phased Results, phase strip and chart markers

**Files:**
- Modify:
  - `src/routes/plan.tsx` `Results` (lines ~574–612)
  - `src/components/plan/PlanChart.tsx`

**Interfaces:**
- Consumes:
  - `pensionLinkFrom`, `phasedTarget`, `monthsToPhasedTarget`, `affordableSpendPhased` (Task 4)
  - `retirementMilestones(…, targetAt)`
  - `PlanChart`'s new optional prop `markers?: { age: number; label: string }[]`
- Produces: none.

- [ ] **Step 1: Switch the maths when `plan.usePension && pension`.**
  - `link = pensionLinkFrom(pension, …)`.
  - `targetAt = (m) => phasedTarget(levers.spend, plan.age + m/12, effAssumptions, link.at(plan.age + m/12))`.
  - `target = targetAt((levers.stop − plan.age) × 12)`, and `months = monthsToPhasedTarget(effProfile, effAssumptions, targetAt)`.
  - Milestones use `targetAt`.
  - Solve points:
    - `requiredMonthly` and `requiredReturn` receive the phased target at the plan's stop age.
    - `solveSpend` uses `affordableSpendPhased`.
    - `solveStop` uses `monthsToPhasedTarget` against the saved plan.
  - Without the pension every line stays as it is today.
- [ ] **Step 2: Add the phase strip under the headline.** Text: "{stop}–{savingsAge}: your savings pay everything → {savingsAge}–{pensionAge}: + DPS/DIP → {pensionAge}+: + state pension {p}".
  - Skip any phase that has zero length.
  - When the stop age < statutory, add: "Stopping at {stop} lowers your state pension from {full} to {reduced} (fewer insured years)." Here full = `retirementSummary` without `stopAge`, and reduced = with it.
- [ ] **Step 3: Chart.**
  - Extend `chartEndAge` to at least pensionAge + 3.
  - Pass `markers` for "DPS/DIP opens" and "State pension starts". `PlanChart` draws them as dashed vertical lines with small labels.
- [ ] **Step 4: Run `npm test && npm run build`.** Expected: PASS.
- [ ] **Step 5: Verify in the preview.**
  - With the pension on and stop at 48, the headline age is earlier than with the pension off.
  - The phase strip and markers show, and the early-stop line shows two different pension amounts.
  - The levers still move the headline.
  - Take a screenshot.
- [ ] **Step 6: Commit** `feat(plan): phased results with pension, phase strip and chart markers`.

### Task 10: Dashboard

**Files:**
- Modify:
  - `src/lib/dashboard.ts` `deriveMetrics`: the input gains `pension?: PensionLink | null`. When `plan.usePension && pension`, pass `targetAt` to `retirementMilestones`, and `path[].need` uses `targetAt(m) + debt`.
  - `src/routes/dashboard.tsx`:
    - Build the link from `loadPension()` (CZK only).
    - Add a "Retirement" block to the inputs summary and print view: birth year, gross, years worked, DPS own/employer, DIP own/employer, plus estimated pension and statutory age.
  - `snapshotMetrics`: read `finbuddy.pension.v1` from the snapshot data via the existing `Source` pattern.
- Test: `src/lib/phased.test.ts`, extended for this task.

- [ ] **Step 1: Write the failing test.** `deriveMetrics` with `plan.usePension = true` and a link whose pension covers half the spending gives a lower `target` and an earlier-or-equal `livingAge` than with `pension: null`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test && npm run build`.** Expected: PASS.
- [ ] **Step 5: Verify in the preview.** The dashboard headline matches the Independence results for the same data, and the print view shows the Retirement block.
- [ ] **Step 6: Commit** `feat(dashboard): pension-aware target and Retirement summary`.
