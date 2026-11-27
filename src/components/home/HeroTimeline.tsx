import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { DEFAULT_ASSUMPTIONS, monthsToTarget, targetPotFor, type PlanProfile } from "@/lib/plan";

/**
 * A made-up person in base money units (multiplied by the currency scale for display,
 * so the Czech view reads 30 000 Kč a month and 200 000 Kč saved).
 */
const EXAMPLE = { age: 35, pensionAge: 67, spend: 1200, invested: 8000 };
const MONTHLY = { min: 0, max: 1000, step: 40, start: 600, dip: 240 };
const AXIS = { from: 32, to: 70 };

const at = (age: number) => ((age - AXIS.from) / (AXIS.to - AXIS.from)) * 100;
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

/** Age at which the example person's pot covers their spending for good; null if not by 90. */
function independenceAge(monthly: number): number | null {
  const profile: PlanProfile = {
    age: EXAMPLE.age,
    stop: EXAMPLE.pensionAge,
    spend: EXAMPLE.spend,
    invested: EXAMPLE.invested,
    cash: 0,
    saveInvest: monthly,
    saveCash: 0,
  };
  const target = targetPotFor(EXAMPLE.spend, DEFAULT_ASSUMPTIONS.wd);
  const months = monthsToTarget(profile, DEFAULT_ASSUMPTIONS, target);
  return months === null ? null : EXAMPLE.age + months / 12;
}

/**
 * The home page's hero: one life line and one slider. Moving the monthly amount slides the
 * independence marker away from the state pension, using the same maths as the Plan tab.
 * It moves by itself once on load, then belongs to the visitor.
 */
export function HeroTimeline() {
  const { t, count } = useT();
  const { money } = useFormatters();
  const scale = useCurrencyScale();
  const [monthly, setMonthly] = useState(MONTHLY.start);
  const stopDemo = useRef<() => void>(() => {});

  // Dip and return, so the first paint (and the page without scripts) already shows the answer.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const frames = [
      { until: 700, from: MONTHLY.start, to: MONTHLY.start },
      { until: 1500, from: MONTHLY.start, to: MONTHLY.dip },
      { until: 3100, from: MONTHLY.dip, to: MONTHLY.start },
    ];
    const began = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - began;
      const i = frames.findIndex((f) => elapsed < f.until);
      if (i === -1) {
        setMonthly(MONTHLY.start);
        return;
      }
      const f = frames[i]!;
      const startAt = i === 0 ? 0 : frames[i - 1]!.until;
      const value = f.from + (f.to - f.from) * ease((elapsed - startAt) / (f.until - startAt));
      setMonthly(Math.round(value / MONTHLY.step) * MONTHLY.step);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    stopDemo.current = () => cancelAnimationFrame(raf);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reached = useMemo(() => independenceAge(monthly), [monthly]);
  const early = reached === null ? 0 : Math.max(0, Math.floor(EXAMPLE.pensionAge - reached));
  const isEarly = reached !== null && early > 0;
  const markerAge = isEarly ? reached : EXAMPLE.pensionAge;
  const wonShare = (EXAMPLE.pensionAge - markerAge) / (EXAMPLE.pensionAge - EXAMPLE.age);

  return (
    <div
      className="w-full max-w-[640px] rounded-3xl bg-ink p-6 text-ink-foreground shadow-hero sm:p-8"
      onPointerDownCapture={() => stopDemo.current()}
      onKeyDownCapture={() => stopDemo.current()}
    >
      <p className="text-sm text-ink-muted">
        {t("An example: {age} years old, {pot} saved, lives on {spend} a month.", {
          age: EXAMPLE.age,
          pot: money(EXAMPLE.invested * scale),
          spend: money(EXAMPLE.spend * scale),
        })}
      </p>

      <p className="tnum mt-4 min-w-0 font-display text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-none tracking-tight [overflow-wrap:break-word]">
        {isEarly ? t("{years} early", { years: count(early, "year") }) : t("Not before 67")}
      </p>
      <p className="mt-3 text-[15px] text-ink-muted">
        {isEarly
          ? t("Done with work at {age}, not at {pension}.", {
              age: Math.ceil(reached),
              pension: EXAMPLE.pensionAge,
            })
          : t("At this pace the state pension comes first. Add a little and watch.")}
      </p>

      {/* The life line. Everything that moves does so with transform only. */}
      <div
        className="mt-14"
        role="img"
        aria-label={t("Life line from {age} to the state pension at {pension}", {
          age: EXAMPLE.age,
          pension: EXAMPLE.pensionAge,
        })}
      >
        <div className="relative">
          <div className="relative h-2.5 overflow-hidden rounded-full bg-ink-foreground/12">
            <div
              className="absolute inset-y-0 bg-ink-foreground/25"
              style={{
                left: `${at(EXAMPLE.age)}%`,
                right: `${100 - at(EXAMPLE.pensionAge)}%`,
              }}
            >
              <div
                className="h-full origin-right bg-accent transition-transform duration-200 ease-out motion-reduce:transition-none"
                style={{ transform: `scaleX(${wonShare})` }}
              />
            </div>
          </div>

          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-ink-foreground"
            style={{ left: `${at(EXAMPLE.age)}%` }}
          />
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-warning"
            style={{ left: `${at(EXAMPLE.pensionAge)}%` }}
          />

          <div
            className={`pointer-events-none absolute inset-0 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${isEarly ? "opacity-100" : "opacity-0"}`}
            style={{ transform: `translateX(${at(markerAge)}%)` }}
          >
            <span className="absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-ink bg-ink-accent shadow-[0_0_0_5px_color-mix(in_srgb,var(--ink-accent)_28%,transparent)]" />
            <span className="tnum absolute bottom-full left-0 mb-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-accent px-3 py-1 text-sm font-semibold text-ink">
              {t("{age} independent", { age: Math.ceil(markerAge) })}
            </span>
          </div>
        </div>

        <div className="relative mt-4 h-10 text-xs text-ink-muted">
          <span
            className="absolute -translate-x-1/2 text-center leading-tight"
            style={{ left: `${at(EXAMPLE.age)}%` }}
          >
            <strong className="tnum block text-sm text-ink-foreground">{EXAMPLE.age}</strong>
            {t("today")}
          </span>
          <span
            className="absolute -translate-x-1/2 text-center leading-tight"
            style={{ left: `${at(EXAMPLE.pensionAge)}%` }}
          >
            <strong className="tnum block text-sm text-ink-foreground">{EXAMPLE.pensionAge}</strong>
            {t("retirement")}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-ink-foreground/[0.07] p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink-foreground">{t("Put aside each month")}</p>
          <p className="tnum text-xl font-semibold">
            {money(monthly * scale).replace(/[.,]00(?=\D*$)/, "")}
          </p>
        </div>
        <Slider
          className="mt-3"
          value={[monthly]}
          min={MONTHLY.min}
          max={MONTHLY.max}
          step={MONTHLY.step}
          onValueChange={(v) => {
            stopDemo.current();
            setMonthly(v[0] ?? 0);
          }}
          aria-label={t("Put aside each month")}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-ink-muted">
          {t("{ret} yearly return, {infl} inflation, in today's money.", {
            ret: `${DEFAULT_ASSUMPTIONS.ret}%`,
            infl: `${DEFAULT_ASSUMPTIONS.infl}%`,
          })}
        </p>
        <Link
          to="/plan"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-ink-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          {t("Try it with your numbers")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
