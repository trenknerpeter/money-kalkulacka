import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NumberSlider } from "@/components/NumberSlider";
import { Eyebrow, Panel } from "@/components/Panel";
import { PlanChart } from "@/components/plan/PlanChart";
import { PlanVisual } from "@/components/home/Illustrations";
import { useCurrency, useCurrencyScale, useFormatters } from "@/lib/currency";
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
import {
  loadPension,
  pensionFromParams,
  pensionToParams,
  resolvePlanPension,
  retirementSummary,
  type PensionScenario,
} from "@/lib/pension";
import { SALARY_KEY, parseSalaryStore } from "@/lib/salary";
import { loadInvest, loadMortgage, type InvestScenario } from "@/lib/dashboard";
import {
  affordableSpendPhased,
  monthsToPhasedTarget,
  pensionLinkFrom,
  phaseSegments,
  phasedTarget,
  requiredReturnPhased,
  withPensionAge,
} from "@/lib/phased";
import { ageAt, mortgageOwedNote, mortgageSchedule, realBalanceAt, retirementMilestones } from "@/lib/retirement";
import { cn } from "@/lib/utils";
import { scheduleUrlReplace } from "@/lib/urlSync";
import { useT } from "@/lib/i18n";
import { canonical, faqLd, webAppLd } from "@/lib/seo";
import { SEO_CONTENT } from "@/lib/seoContent";
import { SeoArticle } from "@/components/SeoArticle";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Cesta k finanční nezávislosti — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Odpovězte na pět rychlých otázek a zjistěte, kdy můžete reálně přestat pracovat — a co změnit, pokud nestíháte.",
      },
      { property: "og:title", content: "Cesta k finanční nezávislosti — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Zjistěte, kdy můžete přestat pracovat, v dnešních cenách. Bez registrace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      canonical("/plan").meta,
    ],
    scripts: [
      webAppLd(
        "/plan",
        "Cesta k finanční nezávislosti",
        "Odpovězte na pět rychlých otázek a zjistěte, kdy můžete reálně přestat pracovat — a co změnit, pokud nestíháte.",
      ),
      faqLd(SEO_CONTENT.plan.cs.faq),
    ],
    links: [canonical("/plan").link],
  }),
  component: PlanPageWithArticle,
});

function PlanPageWithArticle() {
  return (
    <>
      <PlanPage />
      <SeoArticle page="plan" />
    </>
  );
}

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
  /** Short name shown in the progress line. */
  label: string;
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
    label: "Age",
    title: "How old are you?",
    helper: "Your current age sets how long your money has to grow.",
    detail: "Use your age today, rounded to the nearest whole year.",
    fields: [{ key: "age", def: 35, min: 18, max: 75 }],
  },
  {
    id: "stop",
    label: "Stop age",
    title: "At what age would you like to stop working?",
    helper: "Aiming early is fine — that's the point of working it out.",
    detail: "This is your target, not a commitment. You can test other ages in your results.",
    fields: [{ key: "stop", def: 60, min: 19, max: 85 }],
  },
  {
    id: "spend",
    label: "Spending",
    title: "How much would you need each month to live on?",
    helper: "In today's money — what your life costs now is usually a good guide.",
    detail: "Include regular living costs and room for the lifestyle you want. Leave out savings contributions.",
    fields: [{ key: "spend", def: 2500, min: 0, max: 1000000, money: true }],
  },
  {
    id: "invest",
    label: "Investments",
    title: "Your investments",
    helper: "Funds, shares, ETFs — money that's in the market.",
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
    label: "Savings",
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
  {
    id: "pension",
    label: "Pension",
    title: "Pension & retirement savings",
    helper: "Count your state pension and DPS/DIP towards your plan, or leave them out.",
    detail: "Only what you'll receive in retirement is counted, in today's money. Czech pension rules apply, so this step is for CZK only.",
    fields: [],
  },
];

/** The one list of steps this visitor sees: the pension step is Czech-only. */
function visibleSteps(currency: string) {
  return currency === "CZK" ? STEPS : STEPS.filter((s) => s.id !== "pension");
}

const FIELDS = STEPS.flatMap((s) => s.fields);

/** Answers in progress, kept while a first-time visitor pops over to the Retirement tab. */
const DRAFT_KEY = "finbuddy.profile.draft.v1";
/** The last plan URL this tab wrote itself (so going Back to it is not mistaken for a shared link). */
const OWN_URL_KEY = "finbuddy.plan.ownUrl";

function loadDraft(): Answers | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Answers> | null;
    if (!d || typeof d !== "object" || typeof d.age !== "number" || typeof d.stop !== "number") return null;
    const n = normalisePlan(d);
    const { wd: _wd, infl: _infl, usePension: _u, ...rest } = n;
    return rest;
  } catch {
    return null;
  }
}

function saveDraft(a: Answers) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

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
  draft = null,
  onDone,
}: {
  initial: SavedPlan | null;
  /** Answers saved before visiting the Retirement tab; resumes at the pension step. */
  draft?: Answers | null;
  onDone: (p: Answers, usePension: boolean) => void;
}) {
  const navigate = useNavigate();
  const { symbol, money, percent } = useFormatters();
  const scale = useCurrencyScale();
  const { t, count } = useT();
  const { currency } = useCurrency();
  const [invest] = useState(() => loadInvest());
  const [pension] = useState(() => loadPension());
  const [salaryGross] = useState<number | null>(() => {
    try {
      return parseSalaryStore(window.localStorage.getItem(SALARY_KEY))?.gross ?? null;
    } catch {
      return null;
    }
  });
  const [usePension, setUsePension] = useState(
    (initial?.usePension ?? false) && pension !== null && currency === "CZK",
  );
  const [step, setStep] = useState(() => {
    if (!draft) return 0;
    const steps = visibleSteps(currency);
    const i = steps.findIndex((s) => s.id === "pension");
    return i >= 0 ? i : steps.length - 1;
  });
  const [ageNotice, setAgeNotice] = useState<{ year: number; age: number } | null>(null);
  const [answers, setAnswers] = useState<Answers>(() => {
    if (initial) {
      const { wd: _wd, infl: _infl, usePension: _u, ...rest } = initial;
      return rest;
    }
    if (draft) return draft;
    const a = Object.fromEntries(
      FIELDS.map((f) => [f.key, f.money ? f.def * scale : f.def]),
    ) as PlanProfile;
    // A first visit starts from the Invest tab's numbers where there are any.
    const ageField = FIELDS.find((f) => f.key === "age")!;
    const fromPension = pension
      ? { age: Math.min(ageField.max, Math.max(ageField.min, new Date().getFullYear() - pension.birthYear)) }
      : {};
    return {
      ...a,
      ...fromPension,
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

  // Steps shown to this visitor; the step count and labels derive from this list.
  const steps = visibleSteps(currency);
  // The list can shrink mid-session (currency switch), so never index past its end.
  const stepIdx = Math.min(step, steps.length - 1);
  const q = steps[stepIdx]!;
  const pensionOn = currency === "CZK" && pension !== null;
  // Same values Independence uses for this stop age.
  const pensionLink = useMemo(
    () =>
      pensionOn && pension ? pensionLinkFrom(pension, { currentYear: new Date().getFullYear(), salaryGross }) : null,
    [pensionOn, pension, salaryGross],
  );
  const phase = pensionLink ? pensionLink.at(answers.stop) : null;
  const ageLabel = (months: number) => {
    const m = Math.round(months);
    const y = Math.floor(m / 12);
    const r = m % 12;
    return r === 0 ? count(y, "year") : t("{a} and {b}", { a: count(y, "year"), b: count(r, "month") });
  };
  const phaseText = phase
    ? (() => {
        const vars = {
          stop: answers.stop,
          p: money(phase.pensionMonthly),
          age: ageLabel(phase.pensionAge * 12),
          pot: money(phase.savingsPot),
          openAge: ageLabel(phase.savingsAge * 12),
        };
        const pot = phase.savingsPot > 0;
        if (phase.pensionMonthly <= 0) {
          return pot
            ? t("If you stop at {stop}: no state pension (fewer than 20 insured years); DPS + DIP ~{pot} from {openAge}", vars)
            : t("If you stop at {stop}: no state pension (fewer than 20 insured years)", vars);
        }
        return pot
          ? t("If you stop at {stop}: state pension ~{p} from {age}; DPS + DIP ~{pot} from {openAge}", vars)
          : t("If you stop at {stop}: state pension ~{p} from {age}", vars);
      })()
    : null;

  // Turning the pension on makes the Retirement tab's birth year the age (one source of truth).
  const togglePension = () => {
    const next = !usePension;
    setUsePension(next);
    if (!next || !pension) {
      setAgeNotice(null);
      return;
    }
    const pensionAge = new Date().getFullYear() - pension.birthYear;
    if (Math.abs(answers.age - pensionAge) > 1) {
      const stop = Math.max(answers.stop, pensionAge + 1);
      setAnswers((a) => ({ ...a, age: pensionAge, stop }));
      setTexts((tx) => ({ ...tx, age: String(pensionAge), stop: String(stop) }));
      setAgeNotice({ year: pension.birthYear, age: pensionAge });
    }
  };
  const helper = q.id === "invest" && pensionOn
    ? "Funds, shares, ETFs — money that's in the market. Leave out DPS and DIP — they're counted from your Retirement tab."
    : q.helper;
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
  }, [stepIdx]);

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
    if (stepIdx === steps.length - 1) {
      onDone(next, usePension && currency === "CZK");
    } else {
      goTo(stepIdx + 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center py-10">
      <div className="mb-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => stepIdx > 0 && goTo(stepIdx - 1)}
          aria-label={t("Back")}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground",
            stepIdx === 0 && "pointer-events-none opacity-0",
          )}
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Step {i} of {n}", { i: stepIdx + 1, n: steps.length })} · {t(q.label)}
          </p>
          <div className="flex items-center gap-2" aria-hidden>
            {steps.map((qq, i) => (
              <span
                key={qq.id}
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i <= stepIdx ? "bg-primary" : "bg-neutral-fill",
                )}
              />
            ))}
          </div>
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
        {helper && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(helper)}</p>}

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
                className="h-9 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                {t("Use these")}
              </button>
            )}
          </div>
        )}

        {q.id === "pension" && (
          <div className="mt-6 space-y-4">
            {pensionOn && phaseText ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                <span className="min-w-0">{phaseText}</span>
                <button
                  type="button"
                  aria-pressed={usePension}
                  onClick={togglePension}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium",
                    usePension
                      ? "border border-primary text-primary"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {usePension && <Check className="size-4" />}
                  {usePension ? t("Using these") : t("Use these")}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border px-4 py-4 text-sm">
                <p>{t("Add your state pension and DPS/DIP to lower what you need to save.")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link
                    to="/duchod"
                    onClick={() => {
                      // A first visit has nothing saved yet: keep the answers for the way back.
                      if (!initial) saveDraft(answers);
                    }}
                    className="inline-flex h-9 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
                  >
                    {t("Open the Retirement tab")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDone(answers, false)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {t("Skip — count on my own money only")}
                  </button>
                </div>
              </div>
            )}
            {usePension && ageNotice && (
              <p role="status" className="text-sm leading-relaxed text-muted-foreground">
                {t("Your Retirement tab says you were born in {y}, so we use age {a}.", {
                  y: ageNotice.year,
                  a: ageNotice.age,
                })}
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("Make sure DPS and DIP aren't in your investments above.")}{" "}
              <button
                type="button"
                onClick={() => goTo(steps.findIndex((x) => x.id === "invest"))}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t("Check my investments")}
              </button>
            </p>
          </div>
        )}

        {q.fields.length > 0 && (
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
        )}
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
          className="mt-10 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {stepIdx === steps.length - 1 ? t("See my plan") : t("Continue")}
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

/* --------------------------------- Intro ---------------------------------- */

function Intro({ onStart }: { onStart: () => void }) {
  const { t } = useT();
  const { currency } = useCurrency();
  const [hasInvest, setHasInvest] = useState(false);
  const [hasPension, setHasPension] = useState(false);
  useEffect(() => {
    setHasInvest(loadInvest() !== null);
    setHasPension(loadPension() !== null);
  }, []);

  const tabs = [hasInvest && t("Invest"), hasPension && t("Retirement")].filter(Boolean) as string[];
  const prefill =
    tabs.length === 2
      ? t("We'll pre-fill from your Invest and Retirement tabs")
      : hasInvest
        ? t("We'll pre-fill from your Invest tab")
        : hasPension
          ? t("We'll pre-fill from your Retirement tab")
          : null;

  const tiles = [
    {
      title: t("The age you can stop"),
      body: t("A realistic age, in today's money."),
      preview: (
        <svg viewBox="0 0 120 48" className="h-12 w-full" aria-hidden="true">
          <line x1="6" y1="36" x2="114" y2="36" className="stroke-border" strokeWidth="2" />
          {[24, 48, 72, 96].map((x) => (
            <line key={x} x1={x} y1="32" x2={x} y2="40" className="stroke-border" strokeWidth="2" />
          ))}
          <circle cx="72" cy="36" r="7" className="fill-primary" />
          <text x="72" y="14" textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
            60
          </text>
        </svg>
      ),
    },
    {
      title: t("How big your pot needs to be"),
      body: t("The number your money has to reach."),
      preview: (
        <svg viewBox="0 0 120 48" className="h-12 w-full" aria-hidden="true">
          <path d="M6 42 C40 40 70 30 110 8" className="fill-none stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <line x1="6" y1="8" x2="114" y2="8" className="stroke-muted-foreground" strokeWidth="1.5" strokeDasharray="4 4" />
        </svg>
      ),
    },
    {
      title: t("What to change if you're short"),
      body: t("Save more, retire later or spend less."),
      preview: (
        <svg viewBox="0 0 120 48" className="h-12 w-full" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="6" y={6 + i * 14} width="108" height="6" rx="3" className="fill-neutral-fill" />
              <rect x="6" y={6 + i * 14} width={[70, 48, 88][i]} height="6" rx="3" className="fill-primary" />
            </g>
          ))}
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-10">
      <Eyebrow className="text-primary-deep">{t("Path to financial independence")}</Eyebrow>
      <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
        {t("When can you stop working?")}
      </h1>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.title}
            className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            {tile.preview}
            <p className="mt-3 text-sm font-semibold">{tile.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tile.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("{n} questions · about 2 minutes · everything in today's money · stays in your browser", {
          n: visibleSteps(currency).length,
        })}
      </p>
      {prefill && <p className="mt-2 text-sm text-muted-foreground">{prefill}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
        >
          {t("Work out my plan")}
        </button>
        <Link
          to="/duchod"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("Only want your state pension? → Retirement tab")}
        </Link>
      </div>
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
  covered = false,
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
  /** The plan already works: the solve is how far this could slip, not what it must reach. */
  covered?: boolean;
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
            <Check className="size-3.5" /> {covered ? t("At the limit") : t("Closed")}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("Now: {v}", { v: now })}</p>
      <p className="tnum mt-3 text-xl font-semibold tracking-tight">
        {solved === null ? "—" : solvedLabel}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {covered
          ? solved === null
            ? t("No limit in this range.")
            : atSolve
              ? t("Any further and the plan stops working.")
              : t("How far this alone could go and still work")
          : solved === null
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

function Results({
  plan,
  pension,
  ownUrl,
  onEdit,
}: {
  /** With the pension used, its age already comes from the Retirement birth year. */
  plan: SavedPlan;
  /** Already null whenever it must not be used (off, non-CZK, no data). */
  pension: PensionScenario | null;
  /** The URL this writes is this browser's own (not showing a shared link's pension). */
  ownUrl: boolean;
  onEdit: () => void;
}) {
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
    if (pension) {
      params.set("usePension", "1");
      for (const [k, v] of Object.entries(pensionToParams(pension))) params.set(k, v);
    }
    scheduleUrlReplace(router, `${window.location.pathname}?${params.toString()}`);
    if (ownUrl) {
      try {
        window.sessionStorage.setItem(OWN_URL_KEY, `?${params.toString()}`);
      } catch {
        /* ignore */
      }
    }
    savePlan({ ...plan, ...profile, ...assumptions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.age, plan.stop, plan.spend, plan.invested, plan.cash, plan.saveInvest, plan.saveCash, assumptions, pension, ownUrl]);

  // Effective (lever-adjusted) scenario drives the hero and the chart.
  // The "save more" lever moves the total; the extra goes into investments.
  const effProfile: PlanProfile = withMonthlyTotal(
    { ...profile, stop: levers.stop, spend: levers.spend },
    levers.save,
  );
  const effAssumptions: PlanAssumptions = { ...assumptions, ret: levers.ret };

  // With the pension on, the number you need depends on the age you stop (it is lower the later you stop).
  const [salaryGross] = useState<number | null>(() => {
    try {
      return parseSalaryStore(window.localStorage.getItem(SALARY_KEY))?.gross ?? null;
    } catch {
      return null;
    }
  });
  const link = useMemo(
    () => (pension ? pensionLinkFrom(pension, { currentYear: new Date().getFullYear(), salaryGross }) : null),
    [pension, salaryGross],
  );
  // The full-career statutory pension: working until the statutory age, no early start.
  const fullPension = useMemo(
    () =>
      pension
        ? retirementSummary(
            { ...pension, workUntil: 0, earlyMonths: 0 },
            { currentYear: new Date().getFullYear(), salaryGross },
          )
        : null,
    [pension, salaryGross],
  );
  const targetAt = link
    ? (m: number) => {
        const age = plan.age + m / 12;
        return phasedTarget(levers.spend, age, effAssumptions, link.at(age));
      }
    : undefined;

  const target = targetAt
    ? targetAt((levers.stop - plan.age) * 12)
    : targetPotFor(levers.spend, assumptions.wd);
  const months = targetAt
    ? monthsToPhasedTarget(effProfile, effAssumptions, targetAt)
    : monthsToTarget(effProfile, effAssumptions, target);
  const reachedAge = months === null ? null : months === 0 ? plan.age : Math.round(plan.age + months / 12);
  const potAtStop = projectPotAtStop(effProfile, effAssumptions);
  const gap = isFinite(target) ? target - potAtStop : Infinity;
  const readiness = isFinite(target) && target > 0 ? Math.max(0, Math.min(1, potAtStop / target)) : null;

  // Milestone 2: when the pot also covers what's left on the mortgage (Mortgage tab, if filled in).
  const milestones = retirementMilestones(effProfile, effAssumptions, schedule, targetAt);
  const debtFreeAge = milestones.debtFreeMonths === null ? null : ageAt(plan, milestones.debtFreeMonths);
  const owesAtReached = reachedAge !== null && milestones.owedAtLiving > 0.5;
  const phaseAt = link ? link.at(levers.stop) : null;
  const pensionStartAge = phaseAt && phaseAt.pensionMonthly > 0 ? Math.round(phaseAt.pensionAge) : null;
  const savingsOpenAge = phaseAt && phaseAt.savingsPot > 0 ? Math.round(phaseAt.savingsAge) : null;
  // Show the pension start (plus a few years) on the chart.
  const chartEndAge = Math.max(
    reachedAge ?? 0,
    owesAtReached ? (debtFreeAge ?? 0) : 0,
    pensionStartAge ?? 0,
  );
  // Markers only for what starts after you stop; at or before the stop age the strip says it.
  const chartMarkers = [
    savingsOpenAge !== null ? { age: savingsOpenAge, label: t("DPS/DIP opens at {age}", { age: savingsOpenAge }) } : null,
    pensionStartAge !== null
      ? { age: pensionStartAge, label: t("State pension starts at {age}", { age: pensionStartAge }) }
      : null,
  ].filter((m): m is { age: number; label: string } => m !== null && m.age > levers.stop);
  const phaseParts = phaseAt
    ? (() => {
        const dpsAt = phaseAt.savingsPot > 0 ? Math.max(levers.stop, phaseAt.savingsAge) : Infinity;
        const penAt = phaseAt.pensionMonthly > 0 ? Math.max(levers.stop, phaseAt.pensionAge) : Infinity;
        const p = t("{v}/mo", { v: money(phaseAt.pensionMonthly) });
        const segs = phaseSegments(levers.stop, phaseAt).filter(
          (s) => s.to === null || Math.round(s.from) < Math.round(s.to),
        );
        return segs.map((s, i) => {
          const range = s.to === null ? `${Math.round(s.from)}+` : `${Math.round(s.from)}–${Math.round(s.to)}`;
          const dps = dpsAt <= s.from + 1e-9;
          const pen = penAt <= s.from + 1e-9;
          if (i === 0) {
            // The first phase reads on its own: name every source that pays.
            return dps && pen
              ? t("{range}: your savings + DPS/DIP + state pension {p}", { range, p })
              : dps
                ? t("{range}: your savings + DPS/DIP", { range })
                : pen
                  ? t("{range}: your savings + state pension {p}", { range, p })
                  : t("{range}: your savings pay everything", { range });
          }
          const prev = segs[i - 1]!;
          const newDps = dps && !(dpsAt <= prev.from + 1e-9);
          const newPen = pen && !(penAt <= prev.from + 1e-9);
          return newDps && newPen
            ? t("{range}: + DPS/DIP + state pension {p}", { range, p })
            : newDps
              ? t("{range}: + DPS/DIP", { range })
              : t("{range}: + state pension {p}", { range, p });
        });
      })()
    : [];
  // With 20–34 insured years the state pension starts 5 years late: say why, and what fixes it.
  const pensionDelay = link ? link.delayAt(levers.stop) : null;
  const earlyStopCut =
    phaseAt && fullPension && levers.stop * 12 < fullPension.pension.statutoryMonths &&
    phaseAt.pensionMonthly < fullPension.pension.monthly
      ? { full: fullPension.pension.monthly, reduced: phaseAt.pensionMonthly }
      : null;

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
  const baseTarget = link
    ? phasedTarget(plan.spend, plan.stop, assumptions, link.at(plan.stop))
    : targetPotFor(plan.spend, assumptions.wd);
  const solveSave = requiredMonthly(profile, assumptions, baseTarget);
  const baseMonths = link
    ? monthsToPhasedTarget(profile, assumptions, (m) => {
        const age = plan.age + m / 12;
        return phasedTarget(plan.spend, age, assumptions, link.at(age));
      })
    : monthsToTarget(profile, assumptions, baseTarget);
  const solveStop = baseMonths === null ? null : Math.round(plan.age + baseMonths / 12);
  const solveSpendRaw = link ? affordableSpendPhased(profile, assumptions, link) : affordableSpend(profile, assumptions);
  // The saved plan already reaches its number by the stop age: the levers show the margin instead.
  const covered = isFinite(baseTarget) && projectPotAtStop(profile, assumptions) >= baseTarget;
  const solveSpend = covered || baseMonths === 0 || solveSpendRaw < plan.spend ? solveSpendRaw : null;
  // With the pension on, the target moves with the return, so the solve re-computes it.
  const solveRet = link ? requiredReturnPhased(profile, assumptions, link) : requiredReturn(profile, assumptions, baseTarget);

  // With the pension on, "now" is judged against the number needed to stop today, not at the stop age.
  const alreadyFunded = targetAt ? months === 0 : isFinite(target) && pot >= target;
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
      <Panel variant="hero" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-foreground/10 px-1.5 py-2 [--muted-foreground:var(--ink-muted)] [--primary:var(--accent)] print:hidden"
              aria-hidden="true"
            >
              <PlanVisual />
            </div>
            <Eyebrow onInk>{t("Your plan at a glance")}</Eyebrow>
          </div>
          {alreadyFunded ? (
            <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink-accent">
              {t("You could stop working now.")}
            </h1>
          ) : unreachable ? (
            <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
              {t("On this path, you don't reach your number.")}
            </h1>
          ) : early ? (
            <>
              <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink-accent">
                {t("You can stop working at {age} — {years} early.", {
                  age: reachedAge ?? levers.stop,
                  years: count(yearsEarly, "year"),
                })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
                {t("That's ahead of your target of {stop}. Keep going until {stop} and you'd have about {v} more than your number.", {
                  stop: levers.stop,
                  v: money(surplusAtStop),
                })}
              </p>
            </>
          ) : onTrack ? (
            <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink-accent">
              {t("You're on track to stop working at {stop}.", { stop: levers.stop })}
            </h1>
          ) : (
            <>
              <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">
                {t("At this rate, you can stop working at {age}.", { age: reachedAge ?? levers.stop })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
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
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {mortgageOwedNote({
                livingAge: reachedAge ?? plan.age,
                debtFreeAge,
                owed: money(milestones.owedAtLiving),
                payoffAge: schedule?.months != null ? Math.round(plan.age + schedule.months / 12) : null,
              })
                .map((x) => t(x.key, x.vars))
                .join(" ")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-ink-foreground/25 px-4 py-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
          >
            {t("Save as PDF")}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-ink-foreground/25 px-4 py-2 text-sm font-medium text-ink-foreground transition-colors hover:bg-ink-foreground/10"
          >
            {t("Edit answers")}
          </button>
        </div>
      </div>

      {(phaseParts.length > 0 || earlyStopCut || pensionDelay) && (
        <div className="-mt-3 space-y-1.5">
          {phaseParts.length > 0 && (
            <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-ink-muted">
              {phaseParts.map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">→</span>}
                  <span>{part}</span>
                </span>
              ))}
            </p>
          )}
          {pensionDelay && (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
              {t("At {stop} you'd have {years} of insurance. The state pension at {statutory} needs 35 — with fewer, it starts 5 years later, at {start}.", {
                stop: levers.stop,
                years: count(pensionDelay.insuredYears, "year"),
                statutory: Math.round(pensionDelay.statutoryAge),
                start: Math.round(pensionDelay.startAge),
              })}
              {pensionDelay.onTimeStop !== null &&
                " " +
                  t("Work until {fix} (or pay voluntary pension insurance for the missing years) to get it at {statutory}.", {
                    fix: pensionDelay.onTimeStop,
                    statutory: Math.round(pensionDelay.statutoryAge),
                  })}
            </p>
          )}
          {earlyStopCut && (
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
              {earlyStopCut.reduced <= 0
                ? t("Stopping at {stop} means you won't qualify for a state pension (fewer than 20 insured years).", {
                    stop: levers.stop,
                  })
                : t("Stopping at {stop} lowers your state pension from {full} to {reduced} (fewer insured years).", {
                    stop: levers.stop,
                    full: money(earlyStopCut.full),
                    reduced: money(earlyStopCut.reduced),
                  })}
            </p>
          )}
        </div>
      )}

        <div className="grid gap-6 border-t border-ink-foreground/10 pt-6 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-ink-muted">{t("Your target")}</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {isFinite(target) ? money(target) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {link
                ? t("Covers your {v} a year of spending until your pensions start, then what they leave uncovered — in today's money.", {
                    v: money(levers.spend * 12),
                  })
                : t("{p} a year of it covers your yearly spending of {v} without touching the pot", {
                    p: percent(assumptions.wd),
                    v: money(levers.spend * 12),
                  })}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              {t("Projected at {stop}", { stop: levers.stop })}
            </p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {money(potAtStop)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
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
            <p className="text-xs uppercase tracking-wide text-ink-muted">{t("The gap")}</p>
            <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,1.85vw,2rem)] font-semibold leading-tight tracking-tight">
              {gap <= 0 ? t("Covered") : isFinite(gap) ? money(gap) : "—"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {gap <= 0 ? t("You're ahead of your number") : t("What the projection is missing")}
            </p>
          </div>
        </div>

        {readiness !== null && (
          <div>
            <div
              className="flex h-3 overflow-hidden rounded-full bg-ink-foreground/10"
              role="img"
              aria-label={t("{p} of your number by {stop}", {
                p: percent(readiness * 100),
                stop: levers.stop,
              })}
            >
              <div
                className={readiness >= 1 ? "bg-accent" : "bg-warning"}
                style={{ width: `${readiness * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              {t("{p} of your number by {stop}", {
                p: percent(readiness * 100),
                stop: levers.stop,
              })}
            </p>
          </div>
        )}
      </Panel>

      <Panel title={t("Getting there")}>
        <PlanChart
          rows={rows}
          target={target}
          stopAge={levers.stop}
          reachedAge={reachedAge}
          debtFreeAge={owesAtReached ? debtFreeAge : null}
          markers={chartMarkers}
          needAt={targetAt ? (age: number) => targetAt((age - plan.age) * 12) : undefined}
        />
      </Panel>

      <div className="print:hidden">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">
              {covered ? t("How much room you have") : t("Four ways to close the gap")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {covered
                ? t("Your plan already works. Each card shows how far one thing could change on its own, with the rest as you answered, and you'd still get there.")
                : t("Each card works out one change on its own, with the rest as you answered. Drag the sliders to try combinations.")}
            </p>
          </div>
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
            title={covered ? t("Save less each month") : t("Save more each month")}
            covered={covered}
            now={money(planSave)}
            solved={solveSave}
            solvedLabel={solveSave !== null ? money(solveSave) : "—"}
            caption={plan.saveCash > 0 && !covered ? t("Anything extra goes into your investments.") : undefined}
            value={levers.save}
            onChange={(v) => setLevers((l) => ({ ...l, save: v }))}
            min={0}
            max={Math.max(5000 * scale, (solveSave ?? 0) * 1.2)}
            step={50 * scale}
            suffix={symbol}
            suffixPosition="left"
          />
          <LeverCard
            title={covered ? t("Stop earlier") : t("Work a bit longer")}
            covered={covered}
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
            title={covered ? t("Live on more") : t("Live on less")}
            covered={covered}
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
            title={covered ? t("Lower returns") : t("Higher returns")}
            covered={covered}
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
  // First visit (no saved plan, no plan in the URL) starts on the intro.
  const [intro, setIntro] = useState(false);
  // Answers kept from before a trip to the Retirement tab.
  const [draft, setDraft] = useState<Answers | null>(null);
  const { currency } = useCurrency();
  // A shared link's pension is used as-is and never written to this browser's storage.
  const [urlPension, setUrlPension] = useState<PensionScenario | null>(null);
  const [storedPension, setStoredPension] = useState<PensionScenario | null>(null);
  // The plan came from someone else's link on this load (not this tab's own URL, e.g. after Back).
  const [planFromUrl, setPlanFromUrl] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlPension(pensionFromParams(params, new Date().getFullYear()));
    setStoredPension(loadPension());
    if (params.has("age") && params.has("stop")) {
      let own = false;
      try {
        own = window.sessionStorage.getItem(OWN_URL_KEY) === window.location.search;
      } catch {
        own = false;
      }
      setPlanFromUrl(!own);
      const raw: Record<string, number> = {};
      params.forEach((v, k) => {
        const n = parseFloat(v);
        if (isFinite(n)) raw[k] = n;
      });
      setPlan(normalisePlan(raw));
    } else {
      const saved = loadPlan();
      setPlan(saved);
      const d = saved === null ? loadDraft() : null;
      setDraft(d);
      setIntro(saved === null && d === null);
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (plan === null && intro) return <Intro onStart={() => setIntro(false)} />;

  const pension = plan
    ? resolvePlanPension({
        usePension: plan.usePension,
        fromUrl: urlPension,
        stored: storedPension,
        currency,
        planFromUrl,
        edited,
      })
    : null;
  // While the pension is used, the Retirement tab's birth year sets the age.
  const shown = plan && pension ? withPensionAge(plan, pension.birthYear, new Date().getFullYear()) : plan;

  if (shown === null || editing) {
    return (
      <Questionnaire
        initial={shown}
        draft={shown === null ? draft : null}
        onDone={(p, usePension) => {
          const { wd, infl } = plan ?? DEFAULT_ASSUMPTIONS;
          clearDraft();
          setDraft(null);
          setPlan({ ...p, wd, infl, usePension });
          setStoredPension(loadPension());
          setEdited(true);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <Results
      key={`${shown.age}-${shown.stop}`}
      plan={shown}
      pension={pension}
      ownUrl={pension === null || pension !== urlPension}
      onEdit={() => setEditing(true)}
    />
  );
}
