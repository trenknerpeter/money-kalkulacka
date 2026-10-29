import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { BalanceChart } from "@/components/mortgage/BalanceChart";
import { PaymentBreakdownChart } from "@/components/mortgage/PaymentBreakdownChart";
import { Switch } from "@/components/ui/switch";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import { buildScenario, solveMonths, solvePayment } from "@/lib/finance";
import { byCurrency } from "@/lib/scenarioDefaults";
import { useScenario } from "@/lib/useScenario";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/mortgage")({
  head: () => ({
    meta: [
      { title: "Hypoteční kalkulačka — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Zadejte zbývající jistinu hypotéky a uvidíte, co změna sazby udělá se splátkou a celkovými úroky.",
      },
      { property: "og:title", content: "Hypoteční kalkulačka — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Porovnejte současnou sazbu hypotéky s jinou sazbou vedle sebe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mortgage,
});

const DEFAULTS = {
  principal: 250000,
  rate: 3.5,
  years: 20,
  payment: 1450,
  newRate: 5,
  solveTerm: false,
  compareRate: false,
  extraPayment: false,
  extraAmount: 10000,
  extraYear: 3,
  extraYearly: false,
  homeValue: 0,
  homeGrowth: false,
  homeRate: 1,
};

const CZK_DEFAULTS: typeof DEFAULTS = {
  ...DEFAULTS,
  principal: 3500000,
  rate: 4.5,
  payment: 22000,
  newRate: 5.5,
  extraAmount: 200000,
};

function Mortgage() {
  const [s, patch] = useScenario("finbuddy.mortgage", byCurrency(DEFAULTS, CZK_DEFAULTS));
  const { money, signedMoney, percent, symbol } = useFormatters();
  const scale = useCurrencyScale();
  const { t, count } = useT();
  const [tableScenario, setTableScenario] = useState<"current" | "whatIf">("current");

  const solved = useMemo(() => {
    if (!s.solveTerm) {
      const months = Math.max(0, Math.round(s.years)) * 12;
      return { months, monthly: solvePayment(s.principal, s.rate, s.years), warning: false };
    }
    const months = solveMonths(s.principal, s.rate, s.payment);
    if (months === null) return { months: 0, monthly: s.payment, warning: true };
    return { months: Math.round(months), monthly: s.payment, warning: false };
  }, [s.solveTerm, s.principal, s.rate, s.years, s.payment]);

  const current = useMemo(
    () => buildScenario(s.principal, s.rate, solved.months, solved.monthly),
    [s.principal, s.rate, solved.months, solved.monthly],
  );

  const withExtra = useMemo(
    () =>
      s.extraPayment
        ? buildScenario(s.principal, s.rate, solved.months, solved.monthly, {
            amount: s.extraAmount,
            month: Math.round(s.extraYear * 12),
            yearly: s.extraYearly,
          })
        : current,
    [s.extraPayment, s.principal, s.rate, solved.months, solved.monthly, s.extraAmount, s.extraYear, s.extraYearly, current],
  );

  const whatIf = useMemo(() => {
    const monthly = solvePayment(s.principal, s.newRate, solved.months / 12);
    return buildScenario(s.principal, s.newRate, solved.months, monthly);
  }, [s.principal, s.newRate, solved.months]);

  const invalid = solved.warning || solved.months <= 0;
  const maxInterest = Math.max(current.totalInterest, whatIf.totalInterest, 1);
  const sameRate = Math.abs(s.rate - s.newRate) < 0.001;
  const rows = tableScenario === "current" ? current.rows : whatIf.rows;

  const interestSaved = Math.max(0, current.totalInterest - withExtra.totalInterest);
  const monthsSaved = Math.max(0, current.months - withExtra.months);

  const delta = (a: number, b: number) => {
    const d = b - a;
    if (sameRate || Math.abs(d) < 0.5) return <span className="text-muted-foreground">—</span>;
    return (
      <span
        className={cn(
          "tnum rounded-full px-2 py-0.5 text-xs font-medium",
          d > 0 ? "bg-negative/10 text-negative" : "bg-accent-soft text-primary",
        )}
      >
        {signedMoney(d)}
      </span>
    );
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-32 lg:-mx-1 lg:max-h-[calc(100dvh-9.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
        <Panel className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{t("Solve for")}</p>
            <div className="flex rounded-md border border-border p-0.5">
              {[
                { label: "Monthly payment", value: false },
                { label: "Remaining term", value: true },
              ].map((opt) => (
                <button
                  key={t(opt.label)}
                  onClick={() => patch({ solveTerm: opt.value })}
                  className={cn(
                    "min-h-9 flex-1 rounded px-3 py-1.5 text-sm leading-tight transition-colors",
                    s.solveTerm === opt.value
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('Enter what you know. If the payment we calculate doesn\'t match your real one, switch to "Remaining term" and enter your actual payment instead.')}
            </p>
          </div>

          <NumberSlider
            label={t("Remaining principal")}
            value={s.principal}
            onChange={(v) => patch({ principal: v })}
            min={0}
            max={1000000 * scale}
            step={5000 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <NumberSlider
            label={t("Current interest rate")}
            value={s.rate}
            onChange={(v) => patch({ rate: v })}
            min={0}
            max={15}
            step={0.05}
            suffix="%"
          />
          {s.solveTerm ? (
            <NumberSlider
              label={t("Current monthly payment")}
              value={s.payment}
              onChange={(v) => patch({ payment: v })}
              min={0}
              max={10000 * scale}
              step={50 * scale}
              suffix={symbol}
              suffixPosition="left"
            />
          ) : (
            <NumberSlider
              label={t("Remaining term")}
              value={s.years}
              onChange={(v) => patch({ years: v })}
              min={1}
              max={40}
              step={1}
              suffix={t("years")}
            />
          )}

          <div className="space-y-4 border-t border-border pt-6">
            <NumberSlider
              label={t("Property value (optional)")}
              value={s.homeValue}
              onChange={(v) => patch({ homeValue: v })}
              min={0}
              max={Math.max(2000000 * scale, s.principal * 2)}
              step={10000 * scale}
              suffix={symbol}
              suffixPosition="left"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("What your home would sell for today. Counts towards your net worth on the Dashboard — never towards your retirement money.")}
            </p>
            {s.homeValue > 0 && (
              <div className="rounded-md border border-border bg-secondary/40 p-4">
                <div className="flex min-h-11 items-center justify-between gap-4">
                  <label htmlFor="home-growth" className="text-sm font-semibold">
                    {t("Include price growth")}
                  </label>
                  <Switch
                    id="home-growth"
                    checked={s.homeGrowth}
                    onCheckedChange={(checked) => patch({ homeGrowth: checked })}
                    aria-label={t("Include price growth")}
                  />
                </div>
                {s.homeGrowth && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <NumberSlider
                      label={t("Growth above inflation")}
                      value={s.homeRate}
                      onChange={(v) => patch({ homeRate: Math.min(v, 3) })}
                      min={0}
                      max={3}
                      step={0.1}
                      suffix="%"
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("On top of inflation — everything here is in today's money. 1% means the home gains 1% a year more than prices in general.")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-secondary/40 p-4">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <label htmlFor="compare-rate" className="text-sm font-semibold">
                {t("Compare another rate")}
              </label>
              <Switch
                id="compare-rate"
                checked={s.compareRate}
                onCheckedChange={(checked) => patch({ compareRate: checked })}
                aria-label={t("Compare another interest rate")}
              />
            </div>
            {s.compareRate && (
              <div className="mt-4 border-t border-border pt-4">
                <NumberSlider
                  label={t("New interest rate")}
                  value={s.newRate}
                  onChange={(v) => patch({ newRate: v })}
                  min={0}
                  max={15}
                  step={0.05}
                  suffix="%"
                />
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-secondary/40 p-4">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <label htmlFor="extra-payment" className="text-sm font-semibold">
                {t("Extra one-time payment")}
              </label>
              <Switch
                id="extra-payment"
                checked={s.extraPayment}
                onCheckedChange={(checked) => patch({ extraPayment: checked })}
                aria-label={t("Extra one-time payment")}
              />
            </div>
            {s.extraPayment && (
              <div className="mt-4 space-y-6 border-t border-border pt-4">
                <NumberSlider
                  label={t("Extra payment amount")}
                  value={s.extraAmount}
                  onChange={(v) => patch({ extraAmount: v })}
                  min={0}
                  max={200000 * scale}
                  step={1000 * scale}
                  suffix={symbol}
                  suffixPosition="left"
                />
                <NumberSlider
                  label={s.extraYearly ? t("Starting in year") : t("Paid in year")}
                  value={s.extraYear}
                  onChange={(v) => patch({ extraYear: v })}
                  min={1}
                  max={Math.max(1, Math.ceil(solved.months / 12))}
                  step={1}
                  suffix={t("year")}
                />
                <div className="flex min-h-11 items-center justify-between gap-4">
                  <label htmlFor="extra-yearly" className="text-sm text-muted-foreground">
                    {t("Repeat every year")}
                  </label>
                  <Switch
                    id="extra-yearly"
                    checked={s.extraYearly}
                    onCheckedChange={(checked) => patch({ extraYearly: checked })}
                    aria-label={t("Repeat every year")}
                  />
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("Rate change impact")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("{v} left", { v: money(s.principal) })}
              {!invalid && t(" over {years}", { years: count(Number((solved.months / 12).toFixed(solved.months % 12 === 0 ? 0 : 1)), "year") })}
              .
            </p>
          </div>
          <CopyLinkButton />
        </div>

        {solved.warning && (
          <div className="flex items-start gap-3 rounded-md border border-negative/30 bg-negative/5 p-4 text-sm text-negative">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{t("That payment doesn't cover the monthly interest — the balance would never go down.")}</p>
          </div>
        )}

        {invalid ? (
          !solved.warning && (
            <Panel>
              <p className="text-sm text-muted-foreground">
                {t("Enter a remaining term and principal to compare rates.")}
              </p>
            </Panel>
          )
        ) : (
          <>
            {s.compareRate ? (
              <Panel title={t("Current vs what-if")}>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-4 text-sm">
                  <div />
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    {t("Now · {p}", { p: percent(s.rate) })}
                  </div>
                  <div className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    {t("What-if · {p}", { p: percent(s.newRate) })}
                  </div>

                  {[
                    { label: "Monthly payment", a: current.monthly, b: whatIf.monthly },
                    { label: "Total interest", a: current.totalInterest, b: whatIf.totalInterest },
                    { label: "Total paid", a: current.totalPaid, b: whatIf.totalPaid },
                  ].map((row) => (
                    <div key={row.label} className="col-span-3 grid grid-cols-subgrid items-center border-t border-border pt-4">
                      <span className="text-muted-foreground">{t(row.label)}</span>
                      <span className="tnum text-right font-medium">{money(row.a)}</span>
                      <span className="flex items-center justify-end gap-2 text-right">
                        <span className="tnum font-medium">{money(row.b)}</span>
                        {delta(row.a, row.b)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  {t("Assumes the same remaining term — the monthly payment absorbs the rate change.")}
                </p>
              </Panel>
            ) : (
              <Panel title={t("Your mortgage")}>
                <div className="grid gap-5 sm:grid-cols-3">
                  {[
                    { label: "Monthly payment", value: current.monthly },
                    { label: "Total interest", value: current.totalInterest },
                    { label: "Total paid", value: current.totalPaid },
                  ].map((item) => (
                    <div key={item.label} className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">{t(item.label)}</p>
                      <p className="tnum mt-1 whitespace-nowrap text-xl font-semibold">{money(item.value)}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title={t("Payments over time")}>
              <PaymentBreakdownChart rows={withExtra.rows} />
              <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> {t("Principal")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-foreground" /> {t("Interest")}
                </span>
              </div>
            </Panel>

            {s.extraPayment && (
              <Panel title={t("Impact of the extra payment")}>
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">{t("Interest saved")}</p>
                    <p className="tnum mt-1 whitespace-nowrap text-xl font-semibold text-primary">
                      {money(interestSaved)}
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">{t("Paid off earlier by")}</p>
                    <p className="tnum mt-1 whitespace-nowrap text-xl font-semibold">
                      {monthsSaved >= 12
                        ? t("{y}y {m}m", { y: Math.floor(monthsSaved / 12), m: monthsSaved % 12 })
                        : t("{m}m", { m: monthsSaved })}
                    </p>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">{t("New total interest")}</p>
                    <p className="tnum mt-1 whitespace-nowrap text-xl font-semibold">
                      {money(withExtra.totalInterest)}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  {s.extraYearly
                    ? t("A payment of {v} every year from year {y}, keeping the same monthly payment.", { v: money(s.extraAmount), y: Math.round(s.extraYear) })
                    : t("A one-time payment of {v} in year {y}, keeping the same monthly payment.", { v: money(s.extraAmount), y: Math.round(s.extraYear) })}
                </p>
              </Panel>
            )}

            {s.compareRate && (
              <Panel title={t("Remaining balance over time")}>
                <BalanceChart current={current.balanceByYear} whatIf={whatIf.balanceByYear} />
                <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-0.5 w-5 bg-foreground" /> {t("Now")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-0.5 w-5 border-t-2 border-dashed border-primary" /> {t("What-if")}
                  </span>
                </div>
              </Panel>
            )}

            {s.compareRate && <Panel title={t("Total interest, compared")}>
              <div className="space-y-6">
                {[
                  { label: t("Now · {p}", { p: percent(s.rate) }), value: current.totalInterest, accent: false },
                  {
                    label: t("What-if · {p}", { p: percent(s.newRate) }),
                    value: whatIf.totalInterest,
                    accent: true,
                  },
                ].map((bar) => {
                  const costsMore = whatIf.totalInterest > current.totalInterest;
                  return (
                    <div key={bar.label}>
                      <div className="mb-2 flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">{bar.label}</span>
                        <span className="tnum text-lg font-semibold">{money(bar.value)}</span>
                      </div>
                      <div className="h-8 w-full overflow-hidden rounded bg-secondary">
                        <div
                          className={cn(
                            "h-full transition-all duration-200",
                            !bar.accent
                              ? "bg-neutral-fill"
                              : sameRate
                                ? "bg-neutral-fill"
                                : costsMore
                                  ? "bg-negative"
                                  : "bg-primary",
                          )}
                          style={{ width: `${(bar.value / maxInterest) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>}

            <Panel className="py-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="years" className="border-none">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {t("Year by year")}
                  </AccordionTrigger>
                  <AccordionContent>
                    {s.compareRate && (
                      <div className="mb-4 flex rounded-md border border-border p-0.5">
                        {(["current", "whatIf"] as const).map((v) => (
                          <button
                            type="button"
                            key={v}
                            onClick={() => setTableScenario(v)}
                            className={cn(
                              "h-8 flex-1 rounded text-xs transition-colors",
                              tableScenario === v
                                ? "bg-secondary font-medium text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {v === "current" ? t("Now · {p}", { p: percent(s.rate) }) : t("What-if · {p}", { p: percent(s.newRate) })}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                          <tr className="border-b border-border">
                            <th className="py-2 text-left font-normal">{t("Year")}</th>
                            <th className="py-2 text-right font-normal">{t("Interest paid")}</th>
                            <th className="py-2 text-right font-normal">{t("Principal paid")}</th>
                            <th className="py-2 text-right font-normal">{t("Remaining balance")}</th>
                          </tr>
                        </thead>
                        <tbody className="tnum">
                          {rows.map((r) => (
                            <tr key={r.year} className="border-b border-border/60 last:border-0">
                              <td className="py-2 text-left">{r.year}</td>
                              <td className="py-2 text-right">{money(r.interestPaid)}</td>
                              <td className="py-2 text-right">{money(r.principalPaid)}</td>
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
