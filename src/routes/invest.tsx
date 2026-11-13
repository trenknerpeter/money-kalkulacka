import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { NumberSlider } from "@/components/NumberSlider";
import { Eyebrow, Panel, StatTile } from "@/components/Panel";
import { PageHeader } from "@/components/PageHeader";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { InvestChart } from "@/components/invest/InvestChart";
import { InvestVisual } from "@/components/home/Illustrations";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import { computeInvest } from "@/lib/finance";
import { byCurrency } from "@/lib/scenarioDefaults";
import { useScenario } from "@/lib/useScenario";
import { useT } from "@/lib/i18n";
import { canonical, faqLd, webAppLd } from "@/lib/seo";
import { SEO_CONTENT } from "@/lib/seoContent";
import { SeoArticle } from "@/components/SeoArticle";

export const Route = createFileRoute("/invest")({
  head: () => ({
    meta: [
      { title: "Investiční kalkulačka — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Podívejte se, jak měsíční vklady v čase rostou díky složenému úročení, kolik z toho je výnos — a kolik to bude mít hodnotu v dnešních cenách.",
      },
      { property: "og:title", content: "Investiční kalkulačka — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Růst investic uvidíte hned při posouvání posuvníků. Bez registrace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      canonical("/invest").meta,
    ],
    scripts: [
      webAppLd(
        "/invest",
        "Investiční kalkulačka",
        "Podívejte se, jak měsíční vklady v čase rostou díky složenému úročení, kolik z toho je výnos — a kolik to bude mít hodnotu v dnešních cenách.",
      ),
      faqLd(SEO_CONTENT.invest.cs.faq),
    ],
    links: [canonical("/invest").link],
  }),
  component: InvestWithArticle,
});

function InvestWithArticle() {
  return (
    <>
      <Invest />
      <SeoArticle page="invest" />
    </>
  );
}

const DEFAULTS = {
  initial: 10000,
  monthly: 500,
  rate: 7,
  years: 20,
  inflation: 2,
  real: false,
  withdrawRate: 4,
  savings: false,
  sInitial: 5000,
  sMonthly: 200,
  sRate: 3,
};

const CZK_DEFAULTS: typeof DEFAULTS = {
  ...DEFAULTS,
  initial: 100000,
  monthly: 3000,
  sInitial: 50000,
  sMonthly: 2000,
};

// Big figures shrink to fit the width of their own box (not the viewport), so
// long amounts like "26 041 611 Kč" never spill out of a narrow column.
function FitNumber({
  value,
  max,
  className = "",
}: {
  value: string;
  max: string;
  className?: string;
}) {
  // ~0.62em per character for semibold tabular figures, with a little slack.
  const em = Math.max(value.length, 6) * 0.62;
  return (
    <div className="@container min-w-0">
      <p
        className={`tnum whitespace-nowrap font-semibold leading-tight tracking-tight ${className}`}
        style={{ fontSize: `min(${max}, calc(100cqi / ${em.toFixed(2)}))` }}
      >
        {value}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  caption,
  accent,
  headline,
}: {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
  headline?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <FitNumber
        value={value}
        max={headline ? "2.25rem" : "1.375rem"}
        className={`mt-1.5 ${accent ? "text-primary" : "text-foreground"}`}
      />
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

function Invest() {
  const [s, patch] = useScenario("finbuddy.invest", byCurrency(DEFAULTS, CZK_DEFAULTS));
  const { money, percent, symbol } = useFormatters();
  const scale = useCurrencyScale();
  const { t, count } = useT();

  const investResult = useMemo(
    () =>
      computeInvest({
        initial: s.initial,
        monthly: s.monthly,
        rate: s.rate,
        years: s.years,
        inflation: s.inflation,
      }),
    [s.initial, s.monthly, s.rate, s.years, s.inflation],
  );

  const savingsResult = useMemo(
    () =>
      computeInvest({
        initial: s.sInitial,
        monthly: s.sMonthly,
        rate: s.sRate,
        years: s.years,
        inflation: s.inflation,
      }),
    [s.sInitial, s.sMonthly, s.sRate, s.years, s.inflation],
  );

  // Combined view: investments plus the optional savings account, on the same horizon.
  const result = useMemo(() => {
    if (!s.savings) return investResult;
    const rows = investResult.rows.map((r, i) => {
      const o = savingsResult.rows[i] ?? r;
      return {
        ...r,
        contributedThisYear: r.contributedThisYear + o.contributedThisYear,
        totalContributed: r.totalContributed + o.totalContributed,
        growth: r.growth + o.growth,
        balance: r.balance + o.balance,
      };
    });
    const finalValue = investResult.finalValue + savingsResult.finalValue;
    const totalContributed = investResult.totalContributed + savingsResult.totalContributed;
    const totalGrowth = investResult.totalGrowth + savingsResult.totalGrowth;
    return {
      ...investResult,
      rows,
      finalValue,
      totalContributed,
      totalGrowth,
      growthShare: finalValue > 0 ? totalGrowth / finalValue : 0,
      realValue: investResult.realValue + savingsResult.realValue,
    };
  }, [s.savings, investResult, savingsResult]);

  const yearlyIncome = (result.finalValue * Math.max(0, s.withdrawRate)) / 100;
  const monthlyIncome = yearlyIncome / 12;
  const inflationFactor = Math.pow(1 + s.inflation / 100, Math.max(0, Math.round(s.years)));

  const emptyState = Math.round(s.years) <= 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 lg:sticky lg:top-24 lg:-mx-1 lg:max-h-[calc(100dvh-7.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
        <Panel variant="input" title={t("Investments")} className="space-y-6">
          <NumberSlider
            label={t("Initial amount")}
            value={s.initial}
            onChange={(v) => patch({ initial: v })}
            min={0}
            max={250000 * scale}
            step={500 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <NumberSlider
            label={t("Monthly contribution")}
            value={s.monthly}
            onChange={(v) => patch({ monthly: v })}
            min={0}
            max={5000 * scale}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <NumberSlider
            label={t("Expected annual return")}
            value={s.rate}
            onChange={(v) => patch({ rate: v })}
            min={0}
            max={15}
            step={0.1}
            suffix="%"
          />
          <NumberSlider
            label={t("Investment period")}
            value={s.years}
            onChange={(v) => patch({ years: v })}
            min={1}
            max={40}
            step={1}
            suffix={t("years")}
          />

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="real" className="text-sm text-muted-foreground">
                {t("Show in today's money")}
              </label>
              <Switch id="real" checked={s.real} onCheckedChange={(v) => patch({ real: v })} />
            </div>
            {s.real && (
              <div className="mt-6">
                <NumberSlider
                  label={t("Inflation rate")}
                  value={s.inflation}
                  onChange={(v) => patch({ inflation: v })}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
              </div>
            )}
          </div>
        </Panel>

        <Panel variant="input" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="savings" className="text-sm font-semibold tracking-tight">
              {t("Savings account")}
            </label>
            <Switch
              id="savings"
              checked={s.savings}
              onCheckedChange={(v) => patch({ savings: v })}
            />
          </div>
          {!s.savings ? (
            <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
              {t(
                "Add money you keep in a savings account. It grows alongside your investments over the same period.",
              )}
            </p>
          ) : (
            <>
              <NumberSlider
                label={t("Initial amount")}
                value={s.sInitial}
                onChange={(v) => patch({ sInitial: v })}
                min={0}
                max={250000 * scale}
                step={500 * scale}
                suffix={symbol}
                suffixPosition="left"
              />
              <NumberSlider
                label={t("Monthly deposit")}
                value={s.sMonthly}
                onChange={(v) => patch({ sMonthly: v })}
                min={0}
                max={5000 * scale}
                step={50 * scale}
                suffix={symbol}
                suffixPosition="left"
              />
              <NumberSlider
                label={t("Interest rate")}
                value={s.sRate}
                onChange={(v) => patch({ sRate: v })}
                min={0}
                max={10}
                step={0.1}
                suffix="%"
              />
              <p className="text-xs text-muted-foreground">
                {t("Same period as your investments: {years}.", {
                  years: count(Math.round(s.years), "year"),
                })}
              </p>
            </>
          )}
        </Panel>
      </div>

      <div className="space-y-8">
        <PageHeader
          title={t("Investment projection")}
          subtitle={t("{years} at {rate} a year, compounded monthly.", {
            years: count(Math.round(s.years), "year"),
            rate: percent(s.rate),
          })}
          Visual={InvestVisual}
        >
          <CopyLinkButton />
        </PageHeader>

        {emptyState ? (
          <Panel>
            <p className="text-sm text-muted-foreground">
              {t("Set an investment period of at least one year to see a projection.")}
            </p>
          </Panel>
        ) : (
          <>
            <Panel variant="hero">
              <Eyebrow onInk>
                {t("In {years} you'll have", { years: count(Math.round(s.years), "year") })}
              </Eyebrow>
              <FitNumber value={money(result.finalValue)} max="4rem" className="mt-3" />
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
                {t(
                  "In today's money that's about {real}. You put in {c}; the remaining {g} is growth.",
                  {
                    real: money(result.realValue),
                    c: money(result.totalContributed),
                    g: money(result.totalGrowth),
                  },
                )}
              </p>
              <div
                className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/10"
                role="img"
                aria-label={t("{p}% of the final value", {
                  p: (result.growthShare * 100).toFixed(0),
                })}
              >
                <div
                  className="bg-white/55"
                  style={{ width: `${(1 - result.growthShare) * 100}%` }}
                />
                <div className="bg-accent" style={{ width: `${result.growthShare * 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-white/55" />
                  {t("Money you put in")} · {((1 - result.growthShare) * 100).toFixed(0)} %
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-accent" />
                  {t("Growth")} · {(result.growthShare * 100).toFixed(0)} %
                </span>
              </div>
              {s.savings && (
                <div className="tnum mt-6 grid gap-x-12 gap-y-2 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
                  <p className="flex justify-between gap-4">
                    <span className="text-ink-muted">{t("Investments")}</span>
                    <span className="font-medium">{money(investResult.finalValue)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-ink-muted">{t("Savings account")}</span>
                    <span className="font-medium">{money(savingsResult.finalValue)}</span>
                  </p>
                </div>
              )}
            </Panel>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                label={t("Total contributed")}
                value={money(result.totalContributed)}
                caption={t("{a} + {n} × {b}", {
                  a: money(s.initial + (s.savings ? s.sInitial : 0)),
                  n: Math.round(s.years) * 12,
                  b: money(s.monthly + (s.savings ? s.sMonthly : 0)),
                })}
              />
              <StatTile
                label={t("Total growth")}
                value={money(result.totalGrowth)}
                accent
                caption={
                  <span className="inline-flex h-6 items-center rounded-full bg-accent-soft px-2.5 text-xs font-semibold text-primary-deep">
                    {t("{p}% of the final value", { p: (result.growthShare * 100).toFixed(0) })}
                  </span>
                }
              />
              <StatTile
                label={t("Per month")}
                value={money(monthlyIncome)}
                caption={t("{p} a year, split over 12 months", { p: percent(s.withdrawRate) })}
              />
            </div>

            <Panel title={t("Growth over time")}>
              <InvestChart rows={result.rows} />
              <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-neutral-fill" /> {t("Money you put in")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" />{" "}
                  {t("Growth")}
                </span>
              </div>
            </Panel>

            <Panel title={t("What it pays you")}>
              <p className="-mt-3 mb-5 text-sm leading-relaxed text-muted-foreground">
                {t(
                  "Once the {years} are up, this is what you could take out each year without touching the rest.",
                  { years: count(Math.round(s.years), "year") },
                )}
              </p>
              <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Invested amount")}
                    </p>
                    <FitNumber value={money(result.finalValue)} max="1.75rem" className="mt-1.5" />
                  </div>
                  <NumberSlider
                    label={t("Withdrawal rate")}
                    value={s.withdrawRate}
                    onChange={(v) => patch({ withdrawRate: v })}
                    min={0}
                    max={10}
                    step={0.1}
                    suffix="%"
                  />
                  <div className="flex gap-2">
                    {[3, 4, 4.5, 5].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => patch({ withdrawRate: r })}
                        className={
                          "h-9 flex-1 rounded-md border text-sm transition-colors " +
                          (Math.abs(s.withdrawRate - r) < 0.01
                            ? "border-primary bg-accent-soft font-medium text-primary"
                            : "border-border text-muted-foreground hover:text-foreground")
                        }
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid content-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
                  <div className="min-w-0 rounded-lg border border-border p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Per month")}
                    </p>
                    <FitNumber
                      value={money(monthlyIncome)}
                      max="2rem"
                      className="mt-1.5 text-primary"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t("{p} a year, split over 12 months", { p: percent(s.withdrawRate) })}
                    </p>
                    {s.real && (
                      <p className="tnum mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                        {t("{v} in today's money", { v: money(monthlyIncome / inflationFactor) })}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 rounded-lg border border-border p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t("Per year")}
                    </p>
                    <FitNumber value={money(yearlyIncome)} max="1.75rem" className="mt-1.5" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t("{v} stays invested", { v: money(result.finalValue) })}
                    </p>
                    {s.real && (
                      <p className="tnum mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                        {t("{v} in today's money", { v: money(yearlyIncome / inflationFactor) })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                {t(
                  "Assumes the pot keeps earning at least the rate you take out, so the balance holds steady. Take out more than it earns and it will shrink over time.",
                )}
              </p>
            </Panel>

            <Panel className="py-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="years" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {t("Year by year")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-2 text-left font-normal">{t("Year")}</th>
                            <th className="py-2 text-right font-normal">{t("Contributed")}</th>
                            <th className="py-2 text-right font-normal">
                              {t("Total contributed")}
                            </th>
                            <th className="py-2 text-right font-normal">{t("Growth")}</th>
                            <th className="py-2 text-right font-normal">{t("Balance")}</th>
                          </tr>
                        </thead>
                        <tbody className="tnum">
                          {result.rows.slice(1).map((r) => (
                            <tr key={r.year} className="border-b border-border/60 last:border-0">
                              <td className="py-2 text-left">{r.year}</td>
                              <td className="py-2 text-right">{money(r.contributedThisYear)}</td>
                              <td className="py-2 text-right">{money(r.totalContributed)}</td>
                              <td className="py-2 text-right text-primary">{money(r.growth)}</td>
                              <td className="py-2 text-right font-medium">{money(r.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
