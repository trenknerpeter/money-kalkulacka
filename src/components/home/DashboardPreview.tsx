import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LifeTimeline } from "@/components/LifeTimeline";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { lifeMarkers } from "@/lib/lifeline";
import { formatCzk } from "@/lib/salary";
import { DATA_TABS, readFilledTabs } from "@/lib/tabs";

// A made-up person, so the preview looks the same for everyone and never shows a half-filled state.
const EXAMPLE = {
  netWorthBase: 50000,
  netPay: 38506,
  savingsRate: 18,
  independenceAge: 58,
  filled: 3,
  markers: lifeMarkers({ age: 35, debtFreeAge: 52, livingAge: 58, pensionAge: 67 }),
};

/**
 * A small version of the Dashboard for the home page, drawn with example numbers.
 * Your own numbers live on the Dashboard itself.
 */
export function DashboardPreview() {
  const { t } = useT();
  const { money, percent } = useFormatters();
  const scale = useCurrencyScale();
  const [hasOwn, setHasOwn] = useState(false);
  useEffect(() => setHasOwn(readFilledTabs().size > 0), []);

  const total = DATA_TABS.length;
  const circ = 2 * Math.PI * 14;

  return (
    <div className="w-full max-w-[520px] rounded-3xl bg-ink p-6 text-ink-foreground shadow-hero sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-accent">
          {t("Your overview")}
        </p>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="rounded-full bg-ink-foreground/10 px-2.5 py-1 font-semibold text-ink-foreground">
            {t("Example")}
          </span>
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
              strokeDasharray={`${(EXAMPLE.filled / total) * circ} ${circ}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="tnum">
            {t("{n} of {total} tabs filled", { n: EXAMPLE.filled, total })}
          </span>
        </div>
      </div>

      <p className="mt-5 text-sm text-ink-muted">{t("Net worth")}</p>
      <p className="tnum mt-1 text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-none tracking-tight">
        {money(EXAMPLE.netWorthBase * scale)}
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {[
          { label: t("Net salary"), value: formatCzk(EXAMPLE.netPay) },
          { label: t("Savings rate"), value: percent(EXAMPLE.savingsRate) },
          { label: t("Independence"), value: t("at {age}", { age: EXAMPLE.independenceAge }) },
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

      <LifeTimeline markers={EXAMPLE.markers} className="mt-7" />

      <Link
        to="/dashboard"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-accent hover:underline"
      >
        {hasOwn ? t("Open your own dashboard") : t("Fill in the tabs to see yours")}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
