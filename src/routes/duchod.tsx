import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ExternalLink, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { NumberSlider } from "@/components/NumberSlider";
import { Eyebrow, Panel } from "@/components/Panel";
import { PageHeader } from "@/components/PageHeader";
import { RetirementVisual } from "@/components/home/Illustrations";
import { SeoArticle } from "@/components/SeoArticle";
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import {
  CZ_PENSION_2026,
  PENSION_KEY,
  normalisePension,
  pensionDefaults,
  resolveGross,
  retirementSummary,
  statutoryAgeMonths,
  type PotProjection,
} from "@/lib/pension";
import { SALARY_KEY, formatCzk, parseSalaryStore } from "@/lib/salary";
import { canonical, faqLd, webAppLd } from "@/lib/seo";
import { SEO_CONTENT } from "@/lib/seoContent";
import { useScenario } from "@/lib/useScenario";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Spočítejte si, kdy půjdete do důchodu, jak vysoký bude starobní důchod a kolik vám přidá penzijní spoření (DPS) a DIP. Odhad v dnešních cenách, zdarma, bez registrace.";
const CSSZ_URL = "https://www.cssz.gov.cz/duchodova-kalkulacka";
const CURRENT_YEAR = new Date().getFullYear();

export const Route = createFileRoute("/duchod")({
  head: () => ({
    meta: [
      { title: "Důchodová kalkulačka 2026 — Money Kalkulačka" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Důchodová kalkulačka 2026 — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Kdy půjdete do důchodu a kolik budete mít. Vše se počítá ve vašem prohlížeči.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      canonical("/duchod").meta,
    ],
    scripts: [
      webAppLd("/duchod", "Důchodová kalkulačka 2026", DESCRIPTION),
      faqLd(SEO_CONTENT.duchod.cs.faq),
    ],
    links: [canonical("/duchod").link],
  }),
  component: DuchodWithArticle,
});

function DuchodWithArticle() {
  return (
    <>
      <Duchod />
      <SeoArticle page="duchod" />
    </>
  );
}

const STRATEGIES = [
  { label: "Conservative", ret: 2 },
  { label: "Balanced", ret: 4 },
  { label: "Dynamic", ret: 7 },
] as const;

/** A year field that lets you type freely and only commits a complete, in-range year. */
function YearField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((prev) => (parseInt(prev, 10) === value ? prev : String(value)));
  }, [value]);
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
          setText(raw);
          const n = parseInt(raw, 10);
          if (raw.length === 4 && n >= min && n <= max) onCommit(n);
        }}
        onBlur={() => setText(String(value))}
        aria-label={label}
        className="tnum h-10 w-28 rounded-lg border border-input bg-card px-3 text-right text-base font-semibold tabular-nums outline-none transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function Duchod() {
  const [raw, patch] = useScenario(PENSION_KEY, pensionDefaults(CURRENT_YEAR));
  // Links and storage can hold anything; compute from clamped values.
  const s = useMemo(() => normalisePension(raw, CURRENT_YEAR), [raw]);
  const { currency } = useCurrency();
  const { t, count } = useT();

  // Live salary from the Salary tab. Read client-side only; never written back.
  const [salaryGross, setSalaryGross] = useState<number | null>(null);
  useEffect(() => {
    try {
      setSalaryGross(parseSalaryStore(window.localStorage.getItem(SALARY_KEY))?.gross ?? null);
    } catch {
      setSalaryGross(null);
    }
  }, []);
  const gross = resolveGross(s, salaryGross);

  const age = CURRENT_YEAR - s.birthYear;
  const statutory = statutoryAgeMonths(s.birthYear, s.female, s.children);

  // The summary clamps a stored early-pension request to the largest allowed (same rule on every page).
  const sum = useMemo(
    () => retirementSummary(s, { currentYear: CURRENT_YEAR, salaryGross }),
    [s, salaryGross],
  );
  const p = sum.pension;
  const { earlyMax, earlyMonths } = sum;

  const hasDps = s.dpsBalance > 0 || s.dpsOwn > 0 || s.dpsEmployer > 0;
  const hasDip = s.dipBalance > 0 || s.dipOwn > 0 || s.dipEmployer > 0;
  const [open, setOpen] = useState<string[]>([]);
  useEffect(() => {
    if (hasDps) setOpen((o) => (o.includes("dps") ? o : [...o, "dps"]));
  }, [hasDps]);
  useEffect(() => {
    if (hasDip) setOpen((o) => (o.includes("dip") ? o : [...o, "dip"]));
  }, [hasDip]);

  const ageLabel = (months: number) => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m === 0
      ? count(y, "year")
      : t("{a} and {b}", { a: count(y, "year"), b: count(m, "month") });
  };
  const yearOf = (months: number) => s.birthYear + Math.floor(months / 12);

  const headlineMonths = p.eligible ? p.startMonths : statutory;
  const childBonus = CZ_PENSION_2026.perChild * s.children;
  const hasSavings = sum.dps !== null || sum.dip !== null;
  const salaryLinked = !s.grossOverride && salaryGross !== null;
  const earlyDisabledReason = !p.eligible
    ? t("Not available: you don't qualify for a state pension yet.")
    : p.delayed
      ? t("Not available when your pension already starts later than the statutory age.")
      : t(
          "Needs at least 40 insured years at the early start. You have {n} at the statutory age.",
          {
            n: p.insuredYears,
          },
        );

  const potBlock = (name: string, pot: PotProjection) => {
    const rows = [
      {
        label: t("Already saved"),
        value: pot.atOpen - pot.paidIn - pot.employer - pot.state - pot.growth,
      },
      { label: t("You paid in"), value: pot.paidIn },
      { label: t("Employer paid in"), value: pot.employer },
      ...(name === "DPS" ? [{ label: t("State contributions"), value: pot.state }] : []),
      { label: t("Growth"), value: pot.growth },
    ].filter((r) => r.value > 0.5 || r.label === t("Growth"));
    return (
      <div key={name} className="mt-5">
        <p className="text-sm font-semibold">
          {t("{name} at {age}:", { name, age: ageLabel(pot.openMonths) })}{" "}
          <span className="tnum">{formatCzk(pot.atOpen)}</span>
        </p>
        <dl className="mt-2 divide-y divide-border text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between py-1.5">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="tnum">{formatCzk(r.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  const savingsFields = (kind: "dps" | "dip") => {
    const k = (f: string) => `${kind}${f}` as keyof typeof s;
    const num = (f: string) => s[k(f)] as number;
    return (
      <>
        <NumberSlider
          label={t("Balance today")}
          value={num("Balance")}
          onChange={(v) => patch({ [k("Balance")]: Math.round(v) })}
          min={0}
          max={2000000}
          step={5000}
          suffix="Kč"
        />
        <NumberSlider
          label={t("Your monthly contribution")}
          value={num("Own")}
          onChange={(v) => patch({ [k("Own")]: Math.round(v) })}
          min={0}
          max={20000}
          step={100}
          suffix="Kč"
        />
        <NumberSlider
          label={t("Employer's monthly contribution")}
          value={num("Employer")}
          onChange={(v) => patch({ [k("Employer")]: Math.round(v) })}
          min={0}
          max={10000}
          step={100}
          suffix="Kč"
        />
        <YearField
          label={kind === "dps" ? t("Year the contract started") : t("Year opened")}
          value={num("Start")}
          min={1990}
          max={CURRENT_YEAR + 50}
          onCommit={(v) => patch({ [k("Start")]: v })}
        />
        {kind === "dps" && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{t("Fund strategy")}</p>
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {STRATEGIES.map((st) => (
                <button
                  key={st.ret}
                  type="button"
                  onClick={() => patch({ dpsRet: st.ret })}
                  className={cn(
                    "min-h-9 flex-1 rounded px-2 py-1.5 text-sm leading-tight transition-colors",
                    s.dpsRet === st.ret
                      ? "bg-accent-soft font-semibold text-primary-deep"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(st.label)}
                </button>
              ))}
            </div>
          </div>
        )}
        <NumberSlider
          label={t("Expected return a year")}
          value={num("Ret")}
          onChange={(v) => patch({ [k("Ret")]: Math.min(15, Math.round(v * 10) / 10) })}
          min={0}
          max={12}
          step={0.5}
          suffix="%"
        />
      </>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-24 lg:-mx-1 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
        <Panel variant="input" className="space-y-6">
          <YearField
            label={t("Year of birth")}
            value={s.birthYear}
            min={1961}
            max={CURRENT_YEAR - 18}
            onCommit={(v) => {
              // Keep "years worked" on its default (age − 22) until the user sets it.
              const wasDefault = s.yearsWorked === Math.max(0, age - 22);
              patch({
                birthYear: v,
                ...(wasDefault ? { yearsWorked: Math.max(0, CURRENT_YEAR - v - 22) } : {}),
              });
            }}
          />

          {s.birthYear <= 1972 && (
            <div className="flex min-h-11 items-center justify-between gap-4">
              <label htmlFor="female" className="text-sm">
                {t("Woman (children lower your retirement age)")}
              </label>
              <Switch
                id="female"
                checked={s.female}
                onCheckedChange={(checked) => patch({ female: checked })}
              />
            </div>
          )}

          <div>
            <NumberSlider
              label={t("Children you raised")}
              value={s.children}
              onChange={(v) => patch({ children: Math.min(10, Math.round(v)) })}
              min={0}
              max={10}
              step={1}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t(
                "Adds 500 Kč a month per child. Only one parent gets it — usually the mother; a father only if he mainly cared for the child. Otherwise leave 0.",
              )}
            </p>
          </div>

          <div>
            <NumberSlider
              label={t("Gross monthly salary")}
              value={Math.round(gross)}
              onChange={(v) => patch({ gross: Math.round(v), grossOverride: true })}
              min={0}
              max={300000}
              step={500}
              suffix="Kč"
            />
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {salaryLinked ? (
                t("From your Salary tab")
              ) : s.grossOverride && salaryGross !== null ? (
                <>
                  {t("Different from your Salary tab")} ·{" "}
                  <button
                    type="button"
                    onClick={() => patch({ grossOverride: false })}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t("reset")}
                  </button>
                </>
              ) : Math.round(gross) === CZ_PENSION_2026.averageWage ? (
                t("Defaults to the 2026 average wage.")
              ) : null}
            </p>
          </div>

          <div>
            <NumberSlider
              label={t("Years worked so far")}
              value={Math.round(s.yearsWorked)}
              onChange={(v) => patch({ yearsWorked: Math.round(v) })}
              min={0}
              max={Math.max(1, age - 15)}
              step={1}
            />
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(
                "Years of pension insurance: employment plus substitute periods such as parental leave.",
              )}
            </p>
          </div>

          <div>
            <NumberSlider
              label={t("Work until (age, 0 = statutory)")}
              value={s.workUntil}
              // 0 = statutory age; otherwise at least 18, the same rule the maths use.
              onChange={(v) => patch({ workUntil: v <= 0 ? 0 : Math.max(18, Math.round(v)) })}
              min={0}
              max={70}
              step={1}
            />
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {s.workUntil === 0 || s.workUntil * 12 >= statutory
                ? t("Working until the statutory age, {age}.", { age: ageLabel(statutory) })
                : t("Stopping earlier means fewer insured years and a lower average.")}
            </p>
          </div>

          <Accordion
            type="multiple"
            value={open}
            onValueChange={setOpen}
            className="border-t border-border"
          >
            <AccordionItem value="dps" className="border-b border-border">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                {t("DPS: supplementary pension savings")}
              </AccordionTrigger>
              <AccordionContent className="space-y-4">{savingsFields("dps")}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="dip" className="border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                {t("DIP: long-term investment product")}
              </AccordionTrigger>
              <AccordionContent className="space-y-4">{savingsFields("dip")}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Panel>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <PageHeader
            title={t("Retirement")}
            subtitle={t("Your state pension and pension savings. Everything is in today's money.")}
            Visual={RetirementVisual}
          >
            <CopyLinkButton />
          </PageHeader>
          {currency !== "CZK" && (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-md bg-accent-soft px-4 py-3 text-sm text-primary"
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                {t(
                  "Pensions are calculated in Czech crowns (Kč) under Czech rules. Your other tabs stay in {currency}.",
                  { currency },
                )}
              </p>
            </div>
          )}
        </div>

        <Panel variant="hero">
          <Eyebrow onInk>{t("State pension (estimate)")}</Eyebrow>
          <p className="tnum mt-3 text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-none tracking-tight">
            {p.eligible ? formatCzk(p.monthly) : formatCzk(0)}
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
            {p.eligible
              ? t("About {v} a month, in today's money.", { v: formatCzk(p.monthly) })
              : t("No state pension with the current inputs.")}{" "}
            <span className="text-ink-foreground">
              {t("You can retire at {age} — in {year}.", {
                age: ageLabel(headlineMonths),
                year: yearOf(headlineMonths),
              })}
            </span>
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            {t(
              "Statutory retirement age under act 155/1995 Sb. as amended, based on your year of birth.",
            )}
          </p>
        </Panel>

        {(!p.eligible || p.delayed) && (
          <Panel className="space-y-4">
            {p.eligible && p.delayed && (
              <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative-soft p-4 text-sm text-negative">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  {t(
                    "With {n} insured years (35 are needed) your pension starts 5 years later than the statutory age ({age}).",
                    { n: p.insuredYears, age: ageLabel(statutory) },
                  )}
                </p>
              </div>
            )}
            {!p.eligible && (
              <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative-soft p-4 text-sm text-negative">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  {t(
                    "Not eligible: with {n} insured years you don't reach the 20 needed for an old-age pension.",
                    { n: p.insuredYears },
                  )}
                </p>
              </div>
            )}
          </Panel>
        )}

        <Panel title={t("State pension")}>
          {p.eligible && (
            <Accordion type="single" collapsible className="-mt-2 border-t border-border">
              <AccordionItem value="breakdown" className="border-none">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                  {t("How it is calculated")}
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="divide-y divide-border text-sm">
                    {[
                      { label: t("Basic amount"), value: formatCzk(p.basic) },
                      {
                        label: t("Percentage amount"),
                        value: formatCzk(p.percent - childBonus),
                      },
                      ...(childBonus > 0
                        ? [{ label: t("Child supplement"), value: formatCzk(childBonus) }]
                        : []),
                      { label: t("Average earnings used"), value: formatCzk(p.base) },
                      { label: t("Calculation base"), value: formatCzk(p.calcBase) },
                      { label: t("Insured years"), value: String(p.insuredYears) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between py-2">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="tnum">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {t(
                      "Years without income lower your average. Your current gross salary stands in for your whole earnings history, indexed to today's wages.",
                    )}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            {t("Estimate. For the exact figure use the ČSSZ calculator")}{" "}
            <a
              href={CSSZ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              cssz.gov.cz
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>

          <div className="mt-6 border-t border-border pt-5">
            <NumberSlider
              label={t("Take the state pension early (months)")}
              value={earlyMonths}
              onChange={(v) => patch({ earlyMonths: Math.min(earlyMax, Math.round(v)) })}
              min={0}
              max={Math.max(1, earlyMax)}
              step={1}
              disabled={earlyMax === 0}
            />
            {earlyMax === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {earlyDisabledReason}
              </p>
            ) : earlyMonths > 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("Your pension starts at {age}, which cuts it by {v} a month for life.", {
                  age: ageLabel(p.startMonths),
                  v: formatCzk(p.earlyCut),
                })}
              </p>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("Up to {n} early, with a permanent cut.", { n: count(earlyMax, "month") })}
              </p>
            )}
          </div>
        </Panel>

        <Panel>
          <p className="text-sm text-muted-foreground">{t("Pension savings (DPS + DIP)")}</p>
          {hasSavings ? (
            <>
              {sum.dps && potBlock("DPS", sum.dps)}
              {sum.dip && potBlock("DIP", sum.dip)}
              <dl className="mt-5 divide-y divide-border border-t border-border text-sm">
                <div className="flex justify-between py-2">
                  <dt className="font-semibold">
                    {t("All savings at {age}", { age: ageLabel(sum.savingsOpenMonths) })}
                  </dt>
                  <dd className="tnum font-semibold">{formatCzk(sum.savingsAtOpen)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">
                    {t("At retirement ({age})", { age: ageLabel(p.startMonths) })}
                  </dt>
                  <dd className="tnum">{formatCzk(sum.savingsAtPension)}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <NumberSlider
                  label={t("Draw it down over (years)")}
                  value={s.drawYears}
                  onChange={(v) => patch({ drawYears: Math.min(30, Math.max(10, Math.round(v))) })}
                  min={10}
                  max={30}
                  step={1}
                />
                <p className="mt-2 text-sm font-medium">
                  {t("≈ {v} a month if drawn over {n} years", {
                    v: formatCzk(sum.drawdown),
                    n: s.drawYears,
                  })}
                </p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t(
                  "DPS and DIP open at 60, after 120 months of saving (60 for DPS from before 2024).",
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Add a DPS or DIP on the left to see what it adds to your retirement income.")}
            </p>
          )}
        </Panel>

        <Panel>
          <p className="text-sm text-muted-foreground">{t("Total monthly income in retirement")}</p>
          <p className="tnum mt-1.5 text-4xl font-semibold tracking-tight text-primary-deep">
            {formatCzk(sum.totalMonthly)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("State pension {a} + savings drawdown {b}. An estimate in today's money.", {
              a: formatCzk(p.monthly),
              b: formatCzk(sum.drawdown),
            })}
          </p>
          {sum.taxSaving > 0 && (
            <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              {t(
                "Your DPS + DIP contributions also cut your income tax by about {v} a year (info only, not added to your savings).",
                { v: formatCzk(sum.taxSaving) },
              )}
            </p>
          )}
        </Panel>

        <Link
          to="/plan"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {t("Want to stop working before this? See your path to financial independence")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>

        <p className="text-xs text-muted-foreground">
          {t("Valid for {year} · an educational estimate, not pension advice.", {
            year: CZ_PENSION_2026.year,
          })}
        </p>
      </div>
    </div>
  );
}
