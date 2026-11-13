import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lock, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { DashboardPreview } from "@/components/home/DashboardPreview";
import {
  InvestVisual,
  MortgageVisual,
  PlanVisual,
  RetirementVisual,
  SalaryVisual,
} from "@/components/home/Illustrations";
import { useT } from "@/lib/i18n";
import { TONE, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { canonical, webSiteLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Money Kalkulačka — čistá mzda, investice, hypotéka a důchod" },
      {
        name: "description",
        content:
          "Money Kalkulačka vám ukáže, kam vaše peníze směřují: spočítejte si čistou mzdu, růst investic, dopad sazby hypotéky a kdy můžete přestat pracovat.",
      },
      {
        property: "og:title",
        content: "Money Kalkulačka — čistá mzda, investice, hypotéka a důchod",
      },
      {
        property: "og:description",
        content:
          "Pět rychlých kalkulaček, které dohromady dají obraz vašich financí. Bez registrace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      canonical("/").meta,
    ],
    scripts: [
      webSiteLd(
        "Money Kalkulačka vám ukáže, kam vaše peníze směřují: spočítejte si čistou mzdu, růst investic, dopad sazby hypotéky a kdy můžete přestat pracovat.",
      ),
    ],
    links: [canonical("/").link],
  }),
  component: Home,
});

type Card = {
  step: number;
  to: "/mzda" | "/duchod" | "/invest" | "/mortgage" | "/plan";
  title: string;
  subtitle: string;
  Visual: ComponentType;
  tone: Tone;
  /** Grid columns on large screens (of 6). */
  span: "lg:col-span-2" | "lg:col-span-4";
  featured?: boolean;
};

const CARDS: Card[] = [
  {
    step: 1,
    to: "/mzda",
    title: "Salary",
    subtitle: "Turn your gross salary into net pay: tax, insurance and child benefit, 2026 rules.",
    Visual: SalaryVisual,
    tone: "green",
    span: "lg:col-span-2",
  },
  {
    step: 2,
    to: "/duchod",
    title: "Retirement",
    subtitle: "When you'll retire, your state pension and what DPS and DIP add.",
    Visual: RetirementVisual,
    tone: "amber",
    span: "lg:col-span-2",
  },
  {
    step: 3,
    to: "/invest",
    title: "Invest",
    subtitle:
      "See how monthly contributions compound over time — and what they're worth in today's money.",
    Visual: InvestVisual,
    tone: "green",
    span: "lg:col-span-2",
  },
  {
    step: 4,
    to: "/mortgage",
    title: "Mortgage",
    subtitle: "Compare your current rate against a what-if rate and see what it really costs.",
    Visual: MortgageVisual,
    tone: "blue",
    span: "lg:col-span-2",
  },
  {
    step: 5,
    to: "/plan",
    title: "Financial independence",
    subtitle: "Answer a few quick questions and find out when you can realistically stop working.",
    Visual: PlanVisual,
    tone: "green",
    span: "lg:col-span-4",
    featured: true,
  },
];

const JOURNEY: { label: string; tone: Tone; to: Card["to"] | "/dashboard" }[] = [
  { label: "Salary", tone: "green", to: "/mzda" },
  { label: "Retirement", tone: "amber", to: "/duchod" },
  { label: "Invest", tone: "green", to: "/invest" },
  { label: "Mortgage", tone: "blue", to: "/mortgage" },
  { label: "Financial independence", tone: "green", to: "/plan" },
  { label: "Dashboard", tone: "green", to: "/dashboard" },
];

function CalculatorCard({ card }: { card: Card }) {
  const { t } = useT();
  const { step, to, title, subtitle, Visual, tone, span, featured } = card;
  return (
    <Link
      to={to}
      className={cn(
        "group flex overflow-hidden rounded-3xl border shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hero focus-visible:outline-2 focus-visible:outline-primary",
        span,
        featured
          ? "border-transparent bg-ink text-ink-foreground md:col-span-2 lg:flex-row"
          : "flex-col border-border bg-card text-foreground",
        featured && "flex-col",
      )}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center px-8 py-6",
          featured
            ? "h-44 bg-white/[0.06] [--muted-foreground:var(--ink-muted)] [--primary:var(--accent)] lg:h-auto lg:w-[44%]"
            : cn("h-40", TONE[tone].tile),
        )}
      >
        <span
          className={cn(
            "absolute left-4 top-4 flex h-7 items-center justify-center rounded-full px-2.5 text-xs font-semibold shadow-sm",
            featured ? "bg-white/15 text-ink-foreground" : cn("bg-card", TONE[tone].text),
          )}
        >
          {t("Step {n}", { n: step })}
        </span>
        <div className="h-full max-h-32 w-full max-w-[220px]">
          <Visual />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-7">
        <h2 className="flex items-center justify-between gap-3 text-2xl font-semibold tracking-tight">
          {t(title)}
          <ArrowRight
            className={cn(
              "size-5 shrink-0 transition-transform group-hover:translate-x-1",
              featured ? "text-ink-accent" : "text-muted-foreground group-hover:text-primary",
            )}
            aria-hidden="true"
          />
        </h2>
        <p
          className={cn(
            "mt-2 text-[15px] leading-relaxed",
            featured ? "text-ink-muted" : "text-muted-foreground",
          )}
        >
          {t(subtitle)}
        </p>
        {featured && (
          <p className="mt-4 text-sm font-semibold text-ink-accent">
            {t("Where the other four come together")}
          </p>
        )}
      </div>
    </Link>
  );
}

function Home() {
  const { t } = useT();

  return (
    <div className="space-y-16">
      <section className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
        <div className="min-w-0 flex-1">
          <p className="inline-flex h-8 items-center gap-2 rounded-full bg-accent-soft px-3 text-sm font-semibold text-primary-deep">
            <span className="size-2 rounded-full bg-accent" />
            {t("Your money, in one picture")}
          </p>
          <h1 className="mt-4 text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
            {t("See where your money is heading.")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t(
              "Money Kalkulačka is a set of quick, private calculators. Each tab answers one question — together they build your personal dashboard. Everything stays in your browser.",
            )}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/mzda"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              {t("Start with Salary")}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {t("Jump to Dashboard")}
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[
              { Icon: Lock, label: "Nothing leaves your browser" },
              { Icon: Zap, label: "Results in seconds" },
              { Icon: Check, label: "Free, no sign-up" },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-primary-deep" aria-hidden="true" />
                {t(label)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-1 justify-center lg:justify-end">
          <DashboardPreview />
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h2 className="text-3xl font-semibold tracking-tight">
            {t("Five questions, one picture")}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {t("Start anywhere. Your numbers carry across tabs.")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
          {CARDS.map((card) => (
            <CalculatorCard key={card.to} card={card} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight">{t("Numbers carry over")}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {t(
              "Your net salary feeds retirement and investing, the mortgage adds your debt, and the Dashboard puts it all into one net worth and one timeline.",
            )}
          </p>
        </div>
        <nav aria-label={t("Ideal journey")}>
          <ol className="flex flex-wrap items-center gap-2">
            {JOURNEY.map((step, i) => (
              <li key={step.to} className="flex items-center gap-2">
                <Link
                  to={step.to}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold transition-opacity hover:opacity-80",
                    step.label === "Dashboard"
                      ? "bg-ink text-ink-foreground"
                      : TONE[step.tone].pill,
                  )}
                >
                  {t(step.label)}
                </Link>
                {i < JOURNEY.length - 1 && (
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </section>
    </div>
  );
}
