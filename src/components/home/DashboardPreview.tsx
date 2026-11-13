import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LifeTimeline } from "@/components/LifeTimeline";
import { useCurrency, useCurrencyScale, useFormatters } from "@/lib/currency";
import { deriveMetrics, loadDashboard, loadInvest, loadMortgage } from "@/lib/dashboard";
import { useT } from "@/lib/i18n";
import { lifeMarkers, type LifeMarker } from "@/lib/lifeline";
import { loadPension, resolvePlanPension, retirementSummary } from "@/lib/pension";
import { pensionLinkFrom } from "@/lib/phased";
import { loadPlan } from "@/lib/plan";
import { SALARY_KEY, calcSalary, formatCzk, parseSalaryStore } from "@/lib/salary";
import { DATA_TABS, readFilledTabs } from "@/lib/tabs";
import { cn } from "@/lib/utils";

type View = {
  example: boolean;
  netWorth: number;
  netPay: number | null;
  savingsRate: number | null;
  independenceAge: number | null;
  filled: number;
  markers: LifeMarker[];
};

/**
 * A small version of the Dashboard for the home page. It reads what is already stored in this
 * browser; with nothing stored it shows clearly labelled example numbers instead.
 */
export function DashboardPreview() {
  const { t } = useT();
  const { money, percent } = useFormatters();
  const scale = useCurrencyScale();
  const { currency } = useCurrency();
  const [stored, setStored] = useState<{
    invest: ReturnType<typeof loadInvest>;
    mortgage: ReturnType<typeof loadMortgage>;
    plan: ReturnType<typeof loadPlan>;
    pension: ReturnType<typeof loadPension>;
    income: number;
    salaryGross: number | null;
    salaryNet: number | null;
    filled: number;
  } | null>(null);

  useEffect(() => {
    try {
      const salary = parseSalaryStore(window.localStorage.getItem(SALARY_KEY));
      setStored({
        invest: loadInvest(),
        mortgage: loadMortgage(),
        plan: loadPlan(),
        pension: loadPension(),
        income: loadDashboard().income,
        salaryGross: salary?.gross ?? null,
        salaryNet: salary ? calcSalary(salary).payout : null,
        filled: readFilledTabs().size,
      });
    } catch {
      setStored(null);
    }
  }, []);

  const view = useMemo<View | null>(() => {
    if (!stored) return null;
    const { invest, mortgage, plan, pension, income, salaryGross, salaryNet, filled } = stored;
    const hasData = Boolean(invest || mortgage || plan || salaryNet !== null || pension);
    if (!hasData) {
      return {
        example: true,
        netWorth: 50000 * scale,
        netPay: null,
        savingsRate: 0.18,
        independenceAge: 58,
        filled: 3,
        markers: lifeMarkers({ age: 35, debtFreeAge: 52, livingAge: 58, pensionAge: 67 }),
      };
    }
    const year = new Date().getFullYear();
    const link = (() => {
      const p = resolvePlanPension({
        usePension: Boolean(plan?.usePension),
        fromUrl: null,
        stored: pension,
        currency,
      });
      return p ? pensionLinkFrom(p, { currentYear: year, salaryGross }) : null;
    })();
    const m = deriveMetrics({ invest, mortgage, plan, income, pension: link });
    const sum = pension ? retirementSummary(pension, { currentYear: year, salaryGross }) : null;
    return {
      example: false,
      netWorth: m.netWorth,
      netPay: salaryNet,
      savingsRate: m.savingsRate,
      independenceAge: m.livingAge,
      filled,
      markers: lifeMarkers({
        age: m.age,
        debtFreeAge: m.debtFreeAge,
        livingAge: m.livingAge,
        pensionAge: sum && sum.pension.eligible ? Math.round(sum.pension.startMonths / 12) : null,
      }),
    };
  }, [stored, scale, currency]);

  const shell =
    "w-full max-w-[520px] rounded-3xl bg-ink p-6 text-ink-foreground shadow-hero sm:p-7";

  if (!view) return <div className={cn(shell, "min-h-[420px]")} aria-hidden="true" />;

  const circ = 2 * Math.PI * 14;
  const total = DATA_TABS.length;

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-accent">
          {t("Your overview")}
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          {view.example && (
            <span className="rounded-full bg-ink-foreground/10 px-2.5 py-1 font-semibold text-ink-foreground">
              {t("Example")}
            </span>
          )}
          <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="4"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(view.filled / total) * circ} ${circ}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="tnum">{t("{n} of {total} tabs filled", { n: view.filled, total })}</span>
        </div>
      </div>

      <p className="mt-5 text-sm text-ink-muted">{t("Net worth")}</p>
      <p className="tnum mt-1 text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-none tracking-tight">
        {money(view.netWorth)}
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {[
          {
            label: t("Net salary"),
            value: view.example
              ? formatCzk(38506)
              : view.netPay !== null
                ? formatCzk(view.netPay)
                : "—",
          },
          {
            label: t("Savings rate"),
            value: view.savingsRate !== null ? percent(view.savingsRate * 100) : "—",
          },
          {
            label: t("Independence"),
            value:
              view.independenceAge !== null ? t("at {age}", { age: view.independenceAge }) : "—",
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl bg-ink-foreground/[0.07] px-3.5 py-2.5 sm:block sm:py-3"
          >
            <p className="text-xs text-ink-muted sm:truncate sm:text-[11px]">{tile.label}</p>
            <p className="tnum text-[15px] font-semibold sm:mt-1 sm:truncate">{tile.value}</p>
          </div>
        ))}
      </div>

      <LifeTimeline markers={view.markers} className="mt-7" />

      <Link
        to="/dashboard"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-accent hover:underline"
      >
        {view.example ? t("Fill in the tabs to see yours") : t("Open the full dashboard")}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
