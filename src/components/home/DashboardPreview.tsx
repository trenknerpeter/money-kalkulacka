import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCurrency, useCurrencyScale, useFormatters } from "@/lib/currency";
import { deriveMetrics, loadDashboard, loadInvest, loadMortgage } from "@/lib/dashboard";
import { useT } from "@/lib/i18n";
import { PENSION_KEY, loadPension, resolvePlanPension, retirementSummary } from "@/lib/pension";
import { pensionLinkFrom } from "@/lib/phased";
import { PLAN_KEY, loadPlan } from "@/lib/plan";
import { SALARY_KEY, calcSalary, formatCzk, parseSalaryStore } from "@/lib/salary";
import { cn } from "@/lib/utils";

type Marker = { age: number; label: string; className: string };

type View = {
  example: boolean;
  netWorth: number;
  netPay: number | null;
  savingsRate: number | null;
  independenceAge: number | null;
  filled: number;
  markers: Marker[];
};

const FILL_KEYS = [SALARY_KEY, PENSION_KEY, "finbuddy.invest", "finbuddy.mortgage", PLAN_KEY];

/** Drops markers that would sit on top of each other, keeping the earlier one. */
function spread(markers: Marker[], lo: number, hi: number): Marker[] {
  const span = Math.max(1, hi - lo);
  const out: Marker[] = [];
  for (const m of [...markers].sort((a, b) => a.age - b.age)) {
    const prev = out[out.length - 1];
    if (prev && ((m.age - prev.age) / span) * 100 < 16) continue;
    out.push(m);
  }
  return out;
}

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
        filled: FILL_KEYS.filter((k) => window.localStorage.getItem(k) !== null).length,
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
        markers: [
          { age: 35, label: "today", className: "bg-white border-2 border-accent" },
          { age: 52, label: "debt-free", className: "bg-info" },
          { age: 58, label: "independent", className: "bg-accent" },
          { age: 67, label: "retirement", className: "bg-warning" },
        ],
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
    const markers: Marker[] = [];
    if (m.age !== null)
      markers.push({ age: m.age, label: "today", className: "bg-white border-2 border-accent" });
    if (m.debtFreeAge !== null)
      markers.push({ age: m.debtFreeAge, label: "debt-free", className: "bg-info" });
    if (m.livingAge !== null)
      markers.push({ age: m.livingAge, label: "independent", className: "bg-accent" });
    if (pension) {
      const sum = retirementSummary(pension, { currentYear: year, salaryGross });
      if (sum.pension.eligible)
        markers.push({
          age: Math.round(sum.pension.startMonths / 12),
          label: "retirement",
          className: "bg-warning",
        });
    }
    return {
      example: false,
      netWorth: m.netWorth,
      netPay: salaryNet,
      savingsRate: m.savingsRate,
      independenceAge: m.livingAge,
      filled,
      markers: markers.length >= 2 ? markers : [],
    };
  }, [stored, scale, currency]);

  const shell =
    "w-full max-w-[520px] rounded-3xl bg-ink p-6 text-ink-foreground shadow-hero sm:p-7";

  if (!view) return <div className={cn(shell, "min-h-[420px]")} aria-hidden="true" />;

  const ages = view.markers.map((m) => m.age);
  const lo = Math.min(...ages, Infinity);
  const hi = Math.max(...ages, -Infinity);
  const pad = Math.max(2, (hi - lo) * 0.08);
  const from = lo - pad;
  const to = hi + pad;
  const shown = view.markers.length ? spread(view.markers, from, to) : [];
  const at = (age: number) => ((age - from) / (to - from)) * 100;
  const todayAge = view.markers.find((m) => m.label === "today")?.age;
  const circ = 2 * Math.PI * 14;

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-accent">
          {t("Your overview")}
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          {view.example && (
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-ink-foreground">
              {t("Example")}
            </span>
          )}
          <svg width="28" height="28" viewBox="0 0 36 36" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
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
              strokeDasharray={`${(view.filled / 5) * circ} ${circ}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="tnum">
            {t("{n} of {total} tabs filled", { n: view.filled, total: 5 })}
          </span>
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
            className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl bg-white/[0.07] px-3.5 py-2.5 sm:block sm:py-3"
          >
            <p className="text-xs text-ink-muted sm:truncate sm:text-[11px]">{tile.label}</p>
            <p className="tnum text-[15px] font-semibold sm:mt-1 sm:truncate">{tile.value}</p>
          </div>
        ))}
      </div>

      {shown.length > 0 && (
        <div className="mt-7" role="img" aria-label={t("Timeline of your money milestones")}>
          <div className="relative h-1.5 rounded-full bg-white/15">
            {todayAge !== undefined && (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${at(todayAge)}%` }}
              />
            )}
            {shown.map((m) => (
              <span
                key={m.label}
                className={cn(
                  "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  m.className,
                )}
                style={{ left: `${at(m.age)}%` }}
              />
            ))}
          </div>
          <div className="relative mt-3 h-11 text-[11px] text-ink-muted">
            {shown.map((m) => (
              <span
                key={m.label}
                className="absolute -translate-x-1/2 text-center leading-tight"
                style={{ left: `${Math.min(92, Math.max(8, at(m.age)))}%` }}
              >
                <strong className="tnum block text-[13px] text-ink-foreground">{m.age}</strong>
                {t(m.label)}
              </span>
            ))}
          </div>
        </div>
      )}

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
