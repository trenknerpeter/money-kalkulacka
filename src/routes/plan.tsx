import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { PlanChart } from "@/components/plan/PlanChart";
import { useCurrencyScale, useFormatters } from "@/lib/currency";
import {
  DEFAULT_ASSUMPTIONS,
  affordableSpend,
  loadPlan,
  monthlyTotal,
  monthsToTarget,
  normalisePlan,
  planRows,
  potAtStop as projectPotAtStop,
  requiredMonthly,
  requiredReturn,
  savePlan,
  startPot,
  targetPotFor,
  withMonthlyTotal,
  type PlanAssumptions,
  type PlanProfile,
  type SavedPlan,
} from "@/lib/plan";
import { loadInvest, loadMortgage, type InvestScenario } from "@/lib/dashboard";
import { ageAt, mortgageSchedule, realBalanceAt, retirementMilestones } from "@/lib/retirement";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Kdy můžete přestat pracovat — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Odpovězte na pět rychlých otázek a zjistěte, kdy můžete reálně přestat pracovat — a co změnit, pokud nestíháte.",
      },
      { property: "og:title", content: "Kdy můžete přestat pracovat — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Zjistěte, kdy můžete přestat pracovat, v dnešních cenách. Bez registrace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

/* ------------------------------ Questionnaire ----------------------------- */

type Answers = PlanProfile & Pick<PlanAssumptions, "ret" | "cashRet">;
type QuestionKey = keyof PlanProfile;
type RateKey = "ret" | "cashRet";

type Field = {
  key: QuestionKey;
  /** Shown above the input when a step asks for more than one number. */
  label?: string;
  def: number;
  min: number;
  max: number;
  money?: boolean;
};

const STEPS: {
  id: string;
  title: string;
  helper?: string;
  detail: string;
  fields: Field[];
  /** A rate slider paired directly under the amounts. */
  rate?: { key: RateKey; label: string; min: number; max: number; step: number; note: string };
  /** Which part of the Invest tab can fill this step in. */
  fromInvest?: "invest" | "savings";
}[] = [
  {
    id: "age",
    title: "How old are you?",
    helper: "Your current age sets how long your money has to grow.",
    detail: "Use your age today, rounded to the nearest whole year.",
    fields: [{ key: "age", def: 35, min: 18, max: 75 }],
  },
  {
    id: "stop",
    title: "At what age would you like to stop working?",
    helper: "Aiming early is fine — that's the point of working it out.",
    detail: "This is your target, not a commitment. You can test other ages in your results.",
    fields: [{ key: "stop", def: 60, min: 19, max: 85 }],
  },
  {
    id: "spend",
    title: "How much would you need each month to live on?",
    helper: "In today's money — what your life costs now is usually a good guide.",
    detail: "Include regular living costs and room for the lifestyle you want. Leave out savings contributions.",
    fields: [{ key: "spend", def: 2500, min: 0, max: 1000000, money: true }],
  },
  {
    id: "invest",
    title: "Your investments",
    helper: "Funds, shares, ETFs, pension pots — money that's in the market.",
    detail: "Use today's value, and only monthly amounts that will continue until your target age. Avoid counting your home unless you plan to sell it.",
    fields: [
      { key: "invested", label: "Invested today", def: 20000, min: 0, max: 100000000, money: true },
      { key: "saveInvest", label: "Invested monthly", def: 500, min: 0, max: 1000000, money: true },
    ],
    rate: {
      key: "ret",
      label: "Expected annual return",
      min: 1,
      max: 15,
      step: 0.5,
      note: "Global index funds have historically returned around 7–8% a year before inflation.",
    },
    fromInvest: "invest",
  },
  {
    id: "savings",
    title: "Your savings accounts",
    helper: "Cash in savings accounts or term deposits rather than the market.",
    detail: "Leave out your everyday current account. Together with your investments this is your starting pot.",
    fields: [
      { key: "cash", label: "In savings today", def: 5000, min: 0, max: 100000000, money: true },
      { key: "saveCash", label: "Saved monthly", def: 200, min: 0, max: 1000000, money: true },
    ],
    rate: {
      key: "cashRet",
      label: "Expected interest rate",
      min: 0,
      max: 10,
      step: 0.1,
      note: "Savings accounts usually pay close to the central bank rate — often around 2–4%.",
    },
    fromInvest: "savings",
  },
];

const FIELDS = STEPS.flatMap((s) => s.fields);

/** The Invest tab's numbers for one step, if it has them. */
function investValuesFor(
  invest: InvestScenario | null,
  which: "invest" | "savings" | undefined,
): Partial<Answers> | null {
  if (!invest || !which) return null;
  if (which === "invest") {
    return { invested: invest.initial, saveInvest: invest.monthly, ret: Math.min(15, invest.rate) };
  }
  if (!invest.savings) return null;
  return { cash: invest.sInitial, saveCash: invest.sMonthly, cashRet: Math.min(10, invest.sRate) };
}

function Questionnaire({
  initial,
  onDone,
}: {
  initial: SavedPlan | null;
  onDone: (p: Answers) => void;
}) {
  const navigate = useNavigate();
  const { symbol, money, percent } = useFormatters();
  const scale = useCurrencyScale();
  const { t } = useT();
  const [invest] = useState(() => loadInvest());
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    if (initial) {
      const { wd: _wd, infl: _infl, ...rest } = initial;
      return rest;
    }
    const a = Object.fromEntries(
      FIELDS.map((f) => [f.key, f.money ? f.def * scale : f.def]),
    ) as PlanProfile;
    // A first visit starts from the Invest tab's numbers where there are any.
    return {
      ...a,
      ret: DEFAULT_ASSUMPTIONS.ret,
      cashRet: DEFAULT_ASSUMPTIONS.cashRet,
      ...investValuesFor(invest, "invest"),
      ...investValuesFor(invest, "savings"),
    };
  });
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, String(answers[f.key])])),
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = STEPS[step]!;
  const multi = q.fields.length > 1;
  const fromInvest = investValuesFor(invest, q.fromInvest);
  const usingInvest =
    fromInvest !== null &&
    Object.entries(fromInvest).every(([k, v]) =>
      k in texts ? parseFloat(texts[k]!) === v : answers[k as RateKey] === v,
    );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [step]);

  const goTo = (next: number) => {
    setStep(next);
    setError(null);
  };

  const useInvest = () => {
    if (!fromInvest) return;
    setAnswers((a) => ({ ...a, ...fromInvest }));
    setTexts((tx) => {
      const next = { ...tx };
      for (const f of q.fields) {
        const v = fromInvest[f.key];
        if (v !== undefined) next[f.key] = String(v);
      }
      return next;
    });
    setError(null);
    // The button turns into a label, so keep Enter working from the inputs.
    inputRef.current?.focus();
  };

  const advance = () => {
    const next = { ...answers };
    for (const f of q.fields) {
      const raw = texts[f.key] ?? "";
      const n = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(",", "."));
      if (!isFinite(n) || isNaN(n)) {
        setError(t("Enter a number to continue."));
        return;
      }
      const value = Math.round(n);
      if (value < f.min || value > f.max) {
        setError(t("Between {min} and {max}, please.", { min: f.min, max: f.max }));
        return;
      }
      if (f.key === "stop" && value <= answers.age) {
        setError(t("It has to be above your current age — otherwise you'd already be there."));
        return;
      }
      next[f.key] = value;
    }
    setAnswers(next);
    if (step === STEPS.length - 1) {
      onDone(next);
    } else {
      goTo(step + 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center py-10">
      <div className="mb-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => step > 0 && goTo(step - 1)}
          aria-label={t("Back")}
          className={cn(
            "flex size-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground",
            step === 0 && "pointer-events-none opacity-0",
          )}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex items-center gap-2">
          {STEPS.map((qq, i) => (
            <span
              key={qq.id}
              className={cn(
                "size-2 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-neutral-fill",
              )}
            />
          ))}
        </div>
        <span className="size-11" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          advance();
        }}
      >
        <h1 className="text-3xl font-semibold tracking-tight">{t(q.title)}</h1>
        {q.helper && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(q.helper)}</p>}

        {fromInvest && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            <span>
              {q.fromInvest === "invest"
                ? t("Invest tab: {a} today, {b} a month at {p}", {
                    a: money(fromInvest.invested ?? 0),
                    b: money(fromInvest.saveInvest ?? 0),
                    p: percent(fromInvest.ret ?? 0),
                  })
                : t("Invest tab: {a} today, {b} a month at {p}", {
                    a: money(fromInvest.cash ?? 0),
                    b: money(fromInvest.saveCash ?? 0),
                    p: percent(fromInvest.cashRet ?? 0),
                  })}
            </span>
            {usingInvest ? (
              <span className="flex items-center gap-1 font-medium text-primary">
                <Check className="size-4" /> {t("Using these")}
              </span>
            ) : (
              <button
                type="button"
                onClick={useInvest}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                {t("Use these")}
              </button>
            )}
          </div>
        )}

        <div className={cn(multi ? "mt-8 grid gap-6 sm:grid-cols-2" : "mt-10")}>
          {q.fields.map((f, i) => (
            <div key={f.key} className="min-w-0">
              {f.label && (
                <label
                  htmlFor={`plan-${f.key}`}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {t(f.label)}
                </label>
              )}
              <div
                className={cn(
                  "flex items-baseline gap-3 border-b-2 border-border pb-3 focus-within:border-primary",
                  f.label && "mt-2",
                )}
              >
                {f.money && (
                  <span className={cn("text-muted-foreground", multi ? "text-xl" : "text-2xl")}>
                    {symbol}
                  </span>
                )}
                <input
                  id={`plan-${f.key}`}
                  ref={i === 0 ? inputRef : undefined}
                  inputMode="decimal"
                  value={texts[f.key] ?? ""}
                  onChange={(e) => {
                    setTexts((tx) => ({ ...tx, [f.key]: e.target.value }));
                    setError(null);
                  }}
                  aria-label={t(f.label ?? q.title)}
                  className={cn(
                    "tnum w-full min-w-0 bg-transparent font-semibold tracking-tight outline-none",
                    multi ? "text-3xl" : "text-4xl",
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(q.detail)}</p>
        {error && <p className="mt-3 text-sm text-muted-foreground">{error}</p>}

        {q.rate && (
          // Keyed per step: the slider keeps its own text, which must not carry over.
          <div key={q.id} className="mt-8 rounded-lg border border-border p-5">
            <NumberSlider
              label={t(q.rate.label)}
              value={answers[q.rate.key]}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.rate!.key]: Math.min(v, q.rate!.max) }))}
              min={q.rate.min}
              max={q.rate.max}
              step={q.rate.step}
              suffix="%"
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(q.rate.note)}</p>
          </div>
        )}

        <button
          type="submit"
          className="mt-10 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {step === STEPS.length - 1 ? t("See my plan") : t("Continue")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate({ to: "/invest" })}
        className="mt-16 self-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t("Skip for now")}
      </button>
    </div>
  );
}

/* --------------------------------- Levers --------------------------------- */

type Levers = { save: number; stop: number; spend: number; ret: number };

function LeverCard({
  title,
  now,
  solved,
  solvedLabel,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  suffixPosition,
  caption,
}: {
  title: string;
  now: string;
  solved: number | null;
  solvedLabel: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  suffixPosition?: "left" | "right";
  caption?: string | undefined;
}) {
  const { t } = useT();
  const atSolve = solved !== null && Math.abs(value - solved) <= step / 2;
  const markerPct =
    solved !== null && max > min ? Math.min(100, Math.max(0, ((solved - min) / (max - min)) * 100)) : null;

  return (
    <div className="rounded-lg border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {atSolve && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Check className="size-3.5" /> {t("Closed")}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("Now: {v}", { v: now })}</p>
      <p className="tnum mt-3 text-xl font-semibold tracking-tight">
        {solved === null ? "—" : solvedLabel}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {solved === null
          ? t("This one can't close the gap on its own.")
          : atSolve
            ? t("This alone closes the gap.")
            : t("What this alone would have to be")}
      </p>
      <div className="relative mt-4">
        <NumberSlider
          label={title}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          suffix={suffix}
          suffixPosition={suffixPosition}
        />
        {markerPct !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-[7px] h-2.5 w-0.5 -translate-x-1/2 bg-primary"
            style={{ left: `${markerPct}%` }}
          />
        )}
      </div>
      {caption && <p className="mt-3 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

/* --------------------------------- Results -------------------------------- */

function Results({ plan, onEdit }: { plan: SavedPlan; onEdit: () => void }) {
  const router = useRouter();
  const { money, percent, symbol } = useFormatters();
  const { t, count, locale } = useT();
  const scale = useCurrencyScale();

  const [assumptions, setAssumptions] = useState<PlanAssumptions>({
    ret: plan.ret,
    cashRet: plan.cashRet,
    wd: plan.wd,
    infl: plan.infl,
  });
  const planSave = monthlyTotal(plan);
  const [schedule] = useState(() => {
    const m = loadMortgage();
    return m && m.principal > 0 ? mortgageSchedule(m) : null;
  });
  const [levers, setLevers] = useState<Levers>({
    save: planSave,
    stop: plan.stop,
    spend: plan.spend,
    ret: plan.ret,
  });

  const profile: PlanProfile = {
    age: plan.age,
    stop: plan.stop,
    spend: plan.spend,
    invested: plan.invested,
    cash: plan.cash,
    saveInvest: plan.saveInvest,
    saveCash: plan.saveCash,
  };
  const pot = startPot(plan);

  // Mirror to URL + localStorage (levers are never persisted).
  useEffect(() => {
    const params = new URLSearchParams({
      age: String(plan.age),
      stop: String(plan.stop),
      spend: String(plan.spend),
      invested: String(plan.invested),
      cash: String(plan.cash),
      saveInvest: String(plan.saveInvest),
      saveCash: String(plan.saveCash),
      ret: String(assumptions.ret),
      cashRet: String(assumptions.cashRet),
      wd: String(assumptions.wd),
      infl: String(assumptions.infl),
    });
    const href = `${window.location.pathname}?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== href) {
      void router.navigate({ href, replace: true, resetScroll: false });
    }
    savePlan({ ...plan, ...profile, ...assumptions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.age, plan.stop, plan.spend, plan.invested, plan.cash, plan.saveInvest, plan.saveCash, assumptions]);

  // Effective (lever-adjusted) scenario drives the hero and the chart.
  // The "save more" lever moves the total; the extra goes into investments.
  const effProfile: PlanProfile = withMonthlyTotal(
    { ...profile, stop: levers.stop, spend: levers.spend },
    levers.save,
  );
  const effAssumptions: PlanAssumptions = { ...assumptions, ret: levers.ret };

  const target = targetPotFor(levers.spend, assumptions.wd);
  const months = monthsToTarget(effProfile, effAssumptions, target);
  const reachedAge = months === null ? null : months === 0 ? plan.age : Math.round(plan.age + months / 12);
  const potAtStop = projectPotAtStop(effProfile, effAssumptions);
  const gap = isFinite(target) ? target - potAtStop : Infinity;

  // Milestone 2: when the pot also covers what's left on the mortgage (Mortgage tab, if filled in).
  const milestones = retirementMilestones(effProfile, effAssumptions, schedule);
  const debtFreeAge = milestones.debtFreeMonths === null ? null : ageAt(plan, milestones.debtFreeMonths);
  const owesAtReached = reachedAge !== null && milestones.owedAtLiving > 0.5;
  const chartEndAge = Math.max(reachedAge ?? 0, owesAtReached ? (debtFreeAge ?? 0) : 0);

  const rows = useMemo(
    () =>
      planRows(
        effProfile,
        effAssumptions,
        chartEndAge > plan.age ? chartEndAge : null,
        (m) => realBalanceAt(schedule, m, effAssumptions.infl),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan.age, plan.invested, plan.cash, plan.saveInvest, plan.saveCash, levers.save, levers.stop, levers.spend, levers.ret, assumptions, chartEndAge, schedule],
  );

  // Solve points are computed from the saved plan, not the dragged levers.
  const baseTarget = targetPotFor(plan.spend, assumptions.wd);
  const solveSave = requiredMonthly(profile, assumptions, baseTarget);
  const baseMonths = monthsToTarget(profile, assumptions, baseTarget);
  const solveStop = baseMonths === null ? null : Math.round(plan.age + baseMonths / 12);
  const solveSpendRaw = affordableSpend(profile, assumptions);
  const solveSpend = baseMonths === 0 || solveSpendRaw < plan.spend ? solveSpendRaw : null;
  const solveRet = requiredReturn(profile, assumptions, baseTarget);

  const alreadyFunded = isFinite(target) && pot >= target;
  const early = !alreadyFunded && reachedAge !== null && reachedAge < levers.stop;
  const onTrack = !alreadyFunded && reachedAge !== null && reachedAge === levers.stop;
  const unreachable = !alreadyFunded && reachedAge === null;
  const yearsEarly = early ? levers.stop - (reachedAge ?? levers.stop) : 0;
  const surplusAtStop = early ? potAtStop - target : 0;

  const leversDirty =
    levers.save !== planSave ||
    levers.stop !== plan.stop ||
    levers.spend !== plan.spend ||
    levers.ret !== assumptions.ret;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {alreadyFunded ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-primary">
              {t("You could stop working now.")}
            </h1>
          ) : unreachable ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
              {t("On this path, you don't reach your number.")}
            </h1>
          ) : early ? (
            <>
              <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-primary">
                {t("You can stop working at {age} — {years} early.", {
                  age: reachedAge ?? levers.stop,
                  years: count(yearsEarly, "year"),
                })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("That's ahead of your target of {stop}. Keep going until {stop} and you'd have about {v} more than your number.", {
                  stop: levers.stop,
                  v: money(surplusAtStop),
                })}
              </p>
            </>
          ) : onTrack ? (
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-primary">
              {t("You're on track to stop working at {stop}.", { stop: levers.stop })}
            </h1>
          ) : (
            <>
              <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
                {t("At this rate, you can stop working at {age}.", { age: reachedAge ?? levers.stop })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("{years} later than your target of {stop}. At {stop} you'd have about {v} — around {gap} short.", {
                  years: count((reachedAge ?? 0) - levers.stop, "year"),
                  stop: levers.stop,
                  v: money(potAtStop),
                  gap: money(Math.max(0, gap)),
                })}
              </p>
            </>
          )}
          {owesAtReached && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {debtFreeAge !== null
                ? t("You'd still owe {d} on the mortgage at {age}. Keep going until {age2} to clear it.", {
                    d: money(milestones.owedAtLiving),
                    age: reachedAge ?? plan.age,
                    age2: debtFreeAge,
                  })
                : t("You'd still owe {d} on the mortgage at {age}.", {
                    d: money(milestones.owedAtLiving),
                    age: reachedAge ?? plan.age,
                  })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("Save as PDF")}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("Edit answers")}
          </button>
        </div>
      </div>

      <Panel>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("Your target")}</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {isFinite(target) ? money(target) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("{p} a year of it covers your yearly spending of {v} without touching the pot", {
                p: percent(assumptions.wd),
                v: money(levers.spend * 12),
              })}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("Projected at {stop}", { stop: levers.stop })}
            </p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {money(potAtStop)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {effProfile.saveCash > 0 || plan.cash > 0
                ? t("{a} a month invested at {p} + {b} saved at {q}, in today's money", {
                    a: money(effProfile.saveInvest),
                    p: percent(levers.ret),
                    b: money(effProfile.saveCash),
                    q: percent(assumptions.cashRet),
                  })
                : t("{v} a month at {p}, in today's money", {
                    v: money(levers.save),
                    p: percent(levers.ret),
                  })}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("The gap")}</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {gap <= 0 ? t("Covered") : isFinite(gap) ? money(gap) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {gap <= 0 ? t("You're ahead of your number") : t("What the projection is missing")}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title={t("Getting there")}>
        <PlanChart
          rows={rows}
          target={target}
          stopAge={levers.stop}
          reachedAge={reachedAge}
          debtFreeAge={owesAtReached ? debtFreeAge : null}
        />
        <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-neutral-fill" /> {t("Money you put in")}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" /> {t("Growth")}
          </span>
          {rows.some((r) => r.debt > 0.5) && (
            <span className="flex items-center gap-2">
              <span className="h-0 w-3 border-t-2 border-dotted border-muted-foreground" />{" "}
              {t("Your number + mortgage left")}
            </span>
          )}
        </div>
      </Panel>

      <div className="print:hidden">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold tracking-tight">{t("Four ways to close the gap")}</h2>
          {leversDirty && (
            <button
              type="button"
              onClick={() =>
                setLevers({ save: planSave, stop: plan.stop, spend: plan.spend, ret: assumptions.ret })
              }
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("Reset levers")}
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <LeverCard
            title={t("Save more each month")}
            now={money(planSave)}
            solved={solveSave}
            solvedLabel={solveSave !== null ? money(solveSave) : "—"}
            caption={plan.saveCash > 0 ? t("Anything extra goes into your investments.") : undefined}
            value={levers.save}
            onChange={(v) => setLevers((l) => ({ ...l, save: v }))}
            min={0}
            max={Math.max(5000 * scale, (solveSave ?? 0) * 1.2)}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <LeverCard
            title={t("Work a bit longer")}
            now={`${plan.stop}`}
            solved={solveStop !== null && solveStop <= 85 ? solveStop : null}
            solvedLabel={solveStop !== null && solveStop <= 85 ? `${solveStop}` : "—"}
            value={levers.stop}
            onChange={(v) => setLevers((l) => ({ ...l, stop: v }))}
            min={plan.age + 1}
            max={85}
            step={1}
            suffix={t("years old")}
          />
          <LeverCard
            title={t("Live on less")}
            now={t("{v}/mo", { v: money(plan.spend) })}
            solved={solveSpend}
            solvedLabel={solveSpend !== null ? t("{v}/mo", { v: money(solveSpend) }) : "—"}
            value={levers.spend}
            onChange={(v) => setLevers((l) => ({ ...l, spend: v }))}
            min={0}
            max={Math.max(plan.spend * 1.5, 1000 * scale)}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <LeverCard
            title={t("Higher returns")}
            now={percent(assumptions.ret)}
            solved={solveRet}
            solvedLabel={solveRet !== null ? `≈${percent(solveRet)}` : "—"}
            value={levers.ret}
            onChange={(v) => setLevers((l) => ({ ...l, ret: v }))}
            min={0}
            max={15}
            step={0.1}
            suffix="%"
            caption={t("Moves your investment return. The one lever you don't control.")}
          />
        </div>
      </div>

      <Panel className="py-2 print:hidden">
        <Accordion type="single" collapsible>
          <AccordionItem value="assumptions" className="border-none">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              {t("Assumptions")}
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-6 text-sm text-muted-foreground">{t("All figures are in today's money.")}</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <NumberSlider
                  label={t("Investment return")}
                  value={assumptions.ret}
                  onChange={(v) => {
                    setAssumptions((a) => ({ ...a, ret: v }));
                    setLevers((l) => ({ ...l, ret: v }));
                  }}
                  min={0}
                  max={15}
                  step={0.1}
                  suffix="%"
                />
                <NumberSlider
                  label={t("Savings interest rate")}
                  value={assumptions.cashRet}
                  onChange={(v) => setAssumptions((a) => ({ ...a, cashRet: v }))}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
                <NumberSlider
                  label={t("Safe withdrawal rate")}
                  value={assumptions.wd}
                  onChange={(v) => setAssumptions((a) => ({ ...a, wd: v }))}
                  min={2}
                  max={8}
                  step={0.1}
                  suffix="%"
                />
                <NumberSlider
                  label={t("Inflation")}
                  value={assumptions.infl}
                  onChange={(v) => setAssumptions((a) => ({ ...a, infl: v }))}
                  min={0}
                  max={10}
                  step={0.1}
                  suffix="%"
                />
              </div>
              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                {t("Take out 4% of the pot in your first year and adjust for inflation after that, and the money has historically lasted 30 years or more. It's a rule of thumb, not a guarantee.")}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Panel>

      {/* Print-only summary: the inputs and assumptions behind the numbers above. */}
      <div className="plan-print-summary hidden print:block">
        <div className="plan-print-summary-card rounded-lg border border-border p-6">
          <p className="text-sm font-semibold tracking-tight">{t("Your inputs")}</p>
          <dl className="tnum mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Age")}</dt>
              <dd>{plan.age}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Target age")}</dt>
              <dd>{levers.stop}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Monthly spending")}</dt>
              <dd>{money(levers.spend)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Invested today")}</dt>
              <dd>{money(plan.invested)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("In savings today")}</dt>
              <dd>{money(plan.cash)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Invested monthly")}</dt>
              <dd>{money(effProfile.saveInvest)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Saved monthly")}</dt>
              <dd>{money(effProfile.saveCash)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm font-semibold tracking-tight">{t("Assumptions")}</p>
          <dl className="tnum mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Investment return")}</dt>
              <dd>{percent(levers.ret)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Savings interest rate")}</dt>
              <dd>{percent(assumptions.cashRet)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Withdrawal rate")}</dt>
              <dd>{percent(assumptions.wd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("Inflation")}</dt>
              <dd>{percent(assumptions.infl)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs text-muted-foreground">
            {t("All figures in today's money. Made with Money Kalkulačka · {date}", {
              date: new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }),
            })}
          </p>
        </div>
        <p className="plan-print-disclaimer mt-8 text-xs leading-relaxed text-muted-foreground">
          {t("Money Kalkulačka does arithmetic, not advice. These are projections based on assumptions you can change — not a prediction, and not a recommendation to buy or sell anything.")}
        </p>
      </div>

      <p className="pb-4 text-xs leading-relaxed text-muted-foreground print:hidden">
        {t("Money Kalkulačka does arithmetic, not advice. These are projections based on assumptions you can change — not a prediction, and not a recommendation to buy or sell anything.")}
      </p>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

function PlanPage() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("age") && params.has("stop")) {
      const raw: Record<string, number> = {};
      params.forEach((v, k) => {
        const n = parseFloat(v);
        if (isFinite(n)) raw[k] = n;
      });
      setPlan(normalisePlan(raw));
    } else {
      setPlan(loadPlan());
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (plan === null || editing) {
    return (
      <Questionnaire
        initial={plan}
        onDone={(p) => {
          const { wd, infl } = plan ?? DEFAULT_ASSUMPTIONS;
          setPlan({ ...p, wd, infl });
          setEditing(false);
        }}
      />
    );
  }

  return <Results plan={plan} onEdit={() => setEditing(true)} />;
}
