# Retirement tab + Plan → Independence — design

Date: 2026-11-12 · Status: draft for approval

## Why

A friend tested the app and said two things.

1. **The state pension is missing.** People in Czechia think about retirement as "when do I get my pension, how much, and what will my 3rd pillar add". The app has nothing for that. Plan also assumes your own money pays for everything forever, which overstates what you need.
2. **Plan is confusing.** It opens straight on "How old are you?". Nothing says what the tab does or what you get at the end. Being dropped into question 1 with no context felt like a survey you never agreed to.

## Shape of the solution (decided)

There are two tabs, each answering one question.

| Tab | Question it answers | Scope |
|---|---|---|
| **Důchod / Retirement** (new, `/duchod`) | "When do I retire, how much will the state pay me, and what will my DPS and DIP add?" | Czechia only, always in CZK |
| **Nezávislost / Independence** (today's Plan, renamed) | "When can I stop working?" | Any currency, as today |

The combination of the two is not a third mode. Independence pulls in Retirement's numbers with the same "Use these" pattern it already uses for the Invest tab. If you fill in Retirement, Independence takes it into account. If you skip it, Independence works exactly as it does today.

## Goals

- Someone who only cares about the state pension gets a clear answer in under a minute: retirement age, monthly state pension, DPS + DIP pot at retirement, and total monthly income.
- Independence tells first-time visitors what it does before asking anything, and gives them one clear button to start.
- When Retirement data is used, Independence's target pot reflects that DPS/DIP and the state pension take over later. It also shows that stopping work early lowers the state pension.
- All figures are in today's money, consistent with the rest of the app.

## Non-goals

- Exact pension calculation. That needs the user's full earnings record (ČSSZ IOLDP). We estimate and link to the [ČSSZ calculator](https://www.cssz.gov.cz/duchodova-kalkulacka) for the exact figure.
- Předdůchod, the lifetime annuity through an insurer, odbytné and partial odbytné, and early withdrawal from DIP.
- Reduced retirement ages for risky work. Users born before 1961 are out of scope; they're at or past retirement already.
- The pending "Lepší penzijko" reform. It isn't law yet. The rules live in one object so it's a one-line change once it passes.
- Pension and DPS logic for non-CZK users.

## Anti-goals (would make this a failure even if it works)

- Showing the pension estimate as if it were exact. Every pension number carries "estimate" wording and the ČSSZ link.
- Independence getting harder for people who don't care about the pension. The retirement step must be skippable in one click.
- Any input typed twice across tabs (salary, age, DPS amounts).

---

## Part 1 — Retirement tab (`/duchod`)

### Layout

The tab is a live form with results updating as you type, like the Salary tab (Mzda), whose layout the tester praised. It is not a step-by-step questionnaire. Inputs sit on the left (stacked on top on mobile) and results on the right. It has an SEO article and FAQ like the other tabs.

If the app currency isn't CZK, show the same notice Mzda shows: "Pensions are calculated in Czech crowns (Kč) under Czech rules…".

### Inputs

**About you**
- **Year of birth.** Range 1961 to (current year − 18).
- **Sex and children raised.** Ask "Children you raised" for everyone. It adds výchovné of 500 CZK per child. Sex matters only for women born ≤1972, where children lower the retirement age. Ask for sex only when the birth year is ≤1972.
- **Gross monthly salary.** Read it live from the Salary tab (`finbuddy.salary`) and label it "From your Salary tab". Fall back to 48,967 CZK, the 2026 average wage.
  - If the user changes it here, store the override in `finbuddy.pension.v1` (never write back to the Salary tab). Show "Different from your Salary tab · reset".
- **Years worked so far.** This means years of pension insurance: employment, plus náhradní doby such as parental leave, which the helper text should mention. Default: max(0, age − 22).
- **Work until.** Default is the statutory retirement age. Users can set it lower to see the effect of stopping early (see "Stopping early" below).

**DPS (doplňkové penzijní spoření, the old "penzijní připojištění")**
- Balance today.
- Your monthly contribution.
- Employer's monthly contribution.
- Year the contract started. This decides when the money opens: age 60, plus 120 months saved for contracts from 2024 or 60 months for older ones.
- Fund strategy: conservative, balanced or dynamic, which sets the default return. The return slider is editable.

**DIP (dlouhodobý investiční produkt)**
- Balance today.
- Your monthly contribution.
- Employer's monthly contribution.
- Year opened.
- Expected return.

DPS and DIP sit in collapsible sections that start closed when empty. Someone with neither still gets a complete pension answer.

### Results

1. **Headline:** "You can retire at 66 years 4 months — in 2058." Plus the statutory age source note.
2. **State pension:** "About 21,800 Kč a month (in today's money)." Show the breakdown in an expandable section (Mzda-style): základní výměra, procentní výměra, výchovné, and the years counted. Always add "Estimate. For the exact figure use the ČSSZ calculator →".
3. **DPS + DIP pot** at the age it opens and at retirement age, in today's money, split into:
   - what you paid in
   - employer contributions
   - state contributions (DPS only)
   - growth

   Then "≈ X Kč a month if drawn over N years", with N on a slider from 10 to 30, default 20.
4. **Total monthly income in retirement:** state pension + DPS/DIP drawdown.
5. **Tax bonus (info only):** "Your DPS + DIP contributions also cut your income tax by about X Kč a year." Computed as 15% × min(48,000, deductible amount). It is not added to any pot.
6. **Early state pension (optional control):** "Take the state pension up to 3 years early." It shows the permanent cut. It is only available with ≥40 insured years at that point; otherwise it's disabled and says why.
7. **CTA to Independence:** "Want to stop working before this? See your path to financial independence →".

### Rules — `src/lib/pension.ts` (pure, unit-tested)

This is a new module. Don't put it in `src/lib/retirement.ts`, which already holds Plan's milestone maths. Rules go in a `CZ_PENSION_2026` object, mirroring `CZ_2026` in `salary.ts`. Sources were checked on 2026-11-12. Cite them in code comments.

**Statutory retirement age** (act 155/1995 Sb. as amended by 270/2023 and 417/2024; ČSSZ handbook 2026):
- **Born 1961–1972:** use this table of years+months. Columns are for women by number of children raised; men use the "W0" column.

  | Born | Men/W0 | W1 | W2 | W3–4 | W5+ |
  |---|---|---|---|---|---|
  | 1961 | 64+4 | 64+2 | 62+8 | 61+2 | 59+8 |
  | 1962 | 64+6 | 64+6 | 63+2 | 61+8 | 60+2 |
  | 1963 | 64+8 | 64+8 | 63+8 | 62+2 | 60+8 |
  | 1964 | 64+10 | 64+10 | 64+2 | 62+8 | 61+2 |
  | 1965 | 65+0 | 65+0 | 64+8 | 63+2 | 61+8 |
  | 1966 | 65+1 | 65+1 | 65+1 | 63+8 | 62+2 |
  | 1967 | 65+2 | 65+2 | 65+2 | 64+2 | 62+8 |
  | 1968 | 65+3 | 65+3 | 65+3 | 64+8 | 63+2 |
  | 1969 | 65+4 | 65+4 | 65+4 | 65+2 | 63+8 |
  | 1970 | 65+5 | 65+5 | 65+5 | 65+5 | 64+2 |
  | 1971 | 65+6 | 65+6 | 65+6 | 65+6 | 64+8 |
  | 1972 | 65+7 | 65+7 | 65+7 | 65+7 | 65+2 |

- **Born 1973–1988:** 65y 8m + (birth year − 1973) months, the same for everyone.
- **Born 1989 or later:** 67y 0m.

**Monthly pension** (decree 365/2025 Sb.), in today's money:
- **Inputs:**
  - **Personal base:** today's gross salary. It stands in for the osobní vyměřovací základ, because past earnings are indexed to today's wage level. Show this simplification in the breakdown.
  - **Insured years:** years worked so far + years until "work until" (or until the stop age when Independence uses it), rounded down.
- **výpočtový základ** = r1 × min(base, 21,546) + 26% × clamp(base − 21,546, 0, 195,868 − 21,546)
  - r1 depends on the year the pension starts: 99% in 2026, falling 1 percentage point a year to 90% from 2035.
- **procentní výměra** = max(4,900, výpočtový základ × rate × insured years) + 500 × children
  - The rate depends on the year the pension starts: 1.495% in 2026, falling 0.005 percentage points a year to 1.450% from 2035.
- **pension** = 4,900 (základní výměra) + procentní výměra. Round up to whole crowns, as the law does.
- **Thresholds and amounts:** keep the 2026 values (21,546, 195,868, 4,900) as "today's money". They are indexed to wages, so treating them as constant in real terms is consistent with keeping salary constant in real terms.
- **Earnings gaps dilute the base.** Real rules average earnings over the whole assessment period, so years with no earnings count as zeros. Model it as:
  - base = gross × (years with earnings ÷ years from first job to the year before the pension starts)
  - Years before the first job are left out (simplification).
  - Without a stop age the ratio is 1. Stopping early then lowers both the base and the insured years.
  - Say this in the breakdown: "Years without income lower your average."
- **Eligibility** (law: 35 years at the statutory age, otherwise 20 years at statutory age + 5):
  - ≥35 insured years at the statutory age: the pension starts at the statutory age.
  - 20–34 years: the pension starts 5 years after the statutory age. The Retirement tab says so, and Independence uses that later age as A_p.
  - Fewer than 20 years: no pension (P = 0). Show it as "not eligible".
- **Early pension:** cut the procentní výměra by 1.5% of the výpočtový základ for every started 90 days early. The cut is 0.75% with ≥45 years. The procentní výměra has a floor of 4,900. It is only allowed with ≥40 years.
- **Sanity example for tests:**
  - Inputs: gross 48,967, retiring in 2058, 44 insured years, no children.
  - výpočtový základ = 0.90 × 21,546 + 0.26 × 27,421 ≈ 26,521
  - procentní výměra ≈ 26,521 × 1.45% × 44 ≈ 16,920
  - pension ≈ 21,820

**DPS** (act 427/2011 Sb.; MF ČR):
- **State contribution per month:**
  - own contribution < 500: 0
  - otherwise 20% × min(own contribution, 1,700), which makes the maximum 340
  - none on employer contributions, and none after a state pension is granted
- **Opens at:** age 60, and at least 120 months saved (contracts from 2024) or 60 months (older contracts). Whichever comes later.
- **Default nominal returns** by strategy (APS ČR 10-year figures, rounded; editable): conservative 2%, balanced 4%, dynamic 7%.
- **Contributions:** your own, the employer's and the state's continue until "work until" or the stop age. After that the pot just grows.

**DIP** (MF ČR DIP guide):
- No state contribution.
- Opens at age 60, and at least 120 months after opening.
- Default return: 7% nominal, editable. Contributions behave like DPS.

**Tax deduction (info line):**
- deductible = min(48,000, max(0, own DPS − 1,700) × 12 + own DIP × 12)
- tax saving = 15% × deductible

**Today's money:** inflation is 2% by default. Pot growth uses the real rate, the same `realMonthlyRate` as Plan. The drawdown "≈ X a month over N years" is an annuity at the pot's own real return.

### Storage and sharing

- Store under `finbuddy.pension.v1`.
- Add it to `SNAPSHOT_KEYS` so dashboard snapshots include it.
- Support share links via the existing `useScenario` / `CopyLinkButton` pattern.

---

## Part 2 — Plan becomes Independence

### Naming

- **Tab label:** "Nezávislost" / "Independence".
- **Page title and intro headline:** "Cesta k finanční nezávislosti" / "Path to financial independence".
- **Subline:** "Kdy můžete přestat pracovat?" / "When can you stop working?"
- **URL:** stays `/plan`, so existing links, shared plans and indexed pages keep working.

### Intro screen

Show the intro on first visit: no saved plan and no plan in the URL. Saved plans go straight to results, as today. The intro has:
- The headline and subline above.
- Three outcomes with a small visual preview: the age you can stop, how big your pot needs to be, and what to change if you're short.
- "5 questions · about 2 minutes · everything in today's money · stays in your browser".
- Pre-fill notice when other tabs have data: "We'll pre-fill from your Invest and Retirement tabs."
- Primary button: "Spočítat můj plán" / "Work out my plan". This starts the questionnaire.
- Secondary link: "Only want your state pension? → Retirement tab".

### Questionnaire changes

- Replace the progress dots with "Step 2 of 6 · Stop age" (a label per step).
- **New last step, "Pension & retirement savings"** (CZK only; skipped entirely in other currencies):
  - **With Retirement data:** show a card like the Invest one: "Retirement tab: state pension ~21,800 Kč from 66y 4m; DPS + DIP ~640,000 Kč from 60 → Use these".
  - **Without:** say "Add your state pension and DPS/DIP to lower what you need to save." Offer a button to the Retirement tab, plus "Skip — count on my own money only".
  - Whether the pension is used is saved on the plan as `usePension: boolean`. The pension inputs are always read live from `finbuddy.pension.v1`, never copied into the plan.
- **Age:** Plan keeps its age step. When Retirement data exists, pre-fill it as current year − birth year. With `usePension` on, the timeline uses Retirement's birth year: S is converted to a date, and A_r and A_p come from the birth year.
- **No double counting:** with `usePension` on, the investments step's helper text says "Leave out DPS and DIP — they're counted from your Retirement tab". The pension step reminds the user to check this, with a back link.
- **Plan share links:** when `usePension` is on, the link also carries the pension inputs, using the Retirement tab's share params, so the recipient sees the same result.
- **Applying them to the recipient's Retirement tab:** recipients don't get their own Retirement tab overwritten unless they open it from the link. This is the same behaviour as other shared tabs.

### Maths with the pension included

With `usePension` off, nothing changes.

With it on, let:
- **S** = stop age.
- **A_r** = the age DPS/DIP opens, computed with contributions ending at S. (DPS and DIP can have different opening ages; using the later one is acceptable.)
- **A_p** = statutory age, or statutory + 5 with 20–34 insured years at S. Independence ignores the Retirement tab's early-pension toggle and always uses the regular start.
- **R(S)** = DPS+DIP pot at A_r, with contributions until S. It enters as a lump sum; the Retirement tab's "over N years" setting doesn't apply here.
- **Phase strip wording:** the strip may still say "+ DPS/DIP", meaning that pot joins the money you draw from.
- **P(S)** = monthly state pension, with insured years counted only until S. This is what makes early stopping cost pension.
- **g** = the real investment return.

Then:
- capital needed at A_p: C_p = max(0, spend − P(S)) × 12 / wd
- at A_r: C_r = PV of spend for (A_p − A_r) years + C_p discounted (A_p − A_r) years; liquid needed = max(0, C_r − R(S))
- target(S) = PV of spend for (A_r − S) years + liquid needed at A_r, discounted (A_r − S) years
- Collapse the phases when S ≥ A_r or S ≥ A_p.

"When can I stop" becomes the earliest S where the projected liquid pot at S ≥ target(S). Search month by month, like `monthsToTarget`, but the target changes with S. Levers (save more, work longer, spend less, returns) re-solve against target(S).

### Results changes

- **Chart:** extend to A_p + 3 when the pension is used. Mark "DPS/DIP opens" and "State pension starts" as vertical markers.
- **Phase strip under the headline:** "48–60: your savings pay everything → 60–66: + DPS/DIP → 66+: + state pension 18,900 Kč".
- **When S is before the statutory age**, add a line: "Stopping at 48 lowers your state pension from 21,800 to 18,900 Kč (fewer insured years)."
- **FAQ:** update the answer to "Does the plan include the state pension?" in `seoContent.ts`.

---

## App-wide changes

- **Nav order:** Salary, Retirement, Invest, Mortgage, Independence, Dashboard. Retirement sits after Salary because it uses the salary. All six must fit or scroll cleanly at 375px; the nav already scrolls horizontally.
- **Homepage:** add a Retirement card, rename the Plan card, and update the journey list.
- **Dashboard:** `deriveMetrics` uses the same target(S) when the plan has `usePension`. Add a Retirement block to the inputs summary and print view. Rename "Plan" labels to "Independence".
- **SEO:**
  - New `/duchod` route with title "Důchodová kalkulačka 2026 — Money Kalkulačka", `webAppLd`, an FAQ in `seoContent.ts` (new `duchod` page key), and a sitemap entry.
  - Update Plan's meta to the Independence naming.
- **i18n:** every new string in English source + Czech in `i18n.tsx`.
- **Tests (vitest):**
  - `pension.test.ts`: the age table edges (1961 W5+, 1972, 1973, 1988, 1989), the sanity example, the minimum pension floor, the early-pension cut, the state-contribution steps (499 / 500 / 1,700 / 3,000), the DPS opening age for pre-2024 and 2024+ contracts, the earnings-gap dilution (stop at 48 lowers the base), and eligibility at 35 / 34 / 20 / 19 insured years.
  - `plan` tests: target(S) collapses to today's formula with the pension off, and target(S) decreases when the pension is on.

## Left to the builder

- Visual design of the Retirement tab and the Independence intro, within the existing design system.
- Exact copy beyond the strings above, in both languages.
- How the phase strip and chart markers look.
- Internal structure of `pension.ts` and the search algorithm, as long as the tests above pass.

## Calls I made (not discussed — please check)

1. The URL stays `/plan`. Only the label and title change.
2. The Retirement tab is a live form like Mzda, not a questionnaire.
3. Today's gross salary stands in for the whole career's earnings.
4. DPS/DIP contributions, including the employer's, stop at the stop age in Independence.
5. The drawdown "≈ X a month" defaults to 20 years.
6. The early state pension toggle (up to 3 years) is in scope. Předdůchod is not.
7. The tax saving is shown as information only and isn't added to any pot.
8. The pension step in Independence is hidden for non-CZK currencies.
9. The tab order is Salary, Retirement, Invest, Mortgage, Independence, Dashboard.
10. **Years with no income lower the pension twice:** through fewer insured years and through a lower average. Years before the first job are ignored. This makes early stopping visibly costlier, and it matches the real rules.
11. **Too few insured years:** 20–34 years means the pension starts 5 years later; under 20 means no pension. This follows the law.
12. **Salary on the Retirement tab:** it follows the Salary tab live. An edit there becomes a local override and never writes back.
13. **Early pension toggle:** Independence ignores it and always uses the regular pension start.
14. **DPS/DIP in Independence:** they enter as a lump sum when they open. The investments question tells users to leave them out, to avoid counting them twice.
15. **Share links:** an Independence share link carries the pension inputs when the pension is switched on.
