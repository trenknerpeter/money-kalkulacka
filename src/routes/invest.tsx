import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { InvestChart } from "@/components/invest/InvestChart";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import { computeInvest } from "@/lib/finance";
import { byCurrency } from "@/lib/scenarioDefaults";
import { useScenario } from "@/lib/useScenario";
import { useT } from "@/lib/i18n";

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
    ],
  }),
  component: Invest,
});

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
      <div className="space-y-6 lg:sticky lg:top-32 lg:-mx-1 lg:max-h-[calc(100dvh-9.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
        <Panel title={t("Investments")} className="space-y-6">
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

        <Panel className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="savings" className="text-sm font-semibold tracking-tight">
              {t("Savings account")}
            </label>
            <Switch id="savings" checked={s.savings} onCheckedChange={(v) => patch({ savings: v })} />
          </div>
          {!s.savings ? (
            <p className="-mt-3 text-xs leading-relaxed text-muted-foreground">
              {t("Add money you keep in a savings account. It grows alongside your investments over the same period.")}
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
                {t("Same period as your investments: {years}.", { years: count(Math.round(s.years), "year") })}
              </p>
            </>
          )}
        </Panel>
      </div>

      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("Investment projection")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("{years} at {rate} a year, compounded monthly.", { years: count(Math.round(s.years), "year"), rate: percent(s.rate) })}
            </p>
          </div>
          <CopyLinkButton />
        </div>

        {emptyState ? (
          <Panel>
            <p className="text-sm text-muted-foreground">
              {t("Set an investment period of at least one year to see a projection.")}
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div
                className={`grid gap-6 sm:grid-cols-2 ${
                  s.real
                    ? "lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]"
                    : "lg:grid-cols-[1.5fr_1fr_1.1fr]"
                }`}
              >
                <Kpi label={t("Final value")} value={money(result.finalValue)} headline />
                <Kpi label={t("Total contributed")} value={money(result.totalContributed)} />
                <Kpi
                  label={t("Total growth")}
                  value={money(result.totalGrowth)}
                  accent
                  caption={t("{p}% of the final value", { p: (result.growthShare * 100).toFixed(0) })}
                />
                {s.real && (
                  <Kpi
                    label={t("In today's money")}
                    value={money(result.realValue)}
                    caption={t("At {p} inflation", { p: percent(s.inflation) })}
                  />
                )}
              </div>
              {s.savings && (
                <div className="tnum mt-6 grid gap-x-12 gap-y-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t("Investments")}</span>
                    <span className="font-medium">{money(investResult.finalValue)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t("Savings account")}</span>
                    <span className="font-medium">{money(savingsResult.finalValue)}</span>
                  </p>
                </div>
              )}
            </Panel>

            <Panel title={t("Growth over time")}>
              <InvestChart rows={result.rows} />
              <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-neutral-fill" /> {t("Money you put in")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" /> {t("Growth")}
                </span>
              </div>
            </Panel>

            <Panel title={t("What it pays you")}>
              <p className="-mt-3 mb-5 text-sm leading-relaxed text-muted-foreground">
                {t("Once the {years} are up, this is what you could take out each year without touching the rest.", { years: count(Math.round(s.years), "year") })}
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
                    <FitNumber value={money(monthlyIncome)} max="2rem" className="mt-1.5 text-primary" />
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
                {t("Assumes the pot keeps earning at least the rate you take out, so the balance holds steady. Take out more than it earns and it will shrink over time.")}
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
                            <th className="py-2 text-right font-normal">{t("Total contributed")}</th>
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
