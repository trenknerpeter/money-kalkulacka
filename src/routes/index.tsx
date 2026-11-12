import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ComponentType } from "react";
import {
  InvestVisual,
  MortgageVisual,
  PlanVisual,
  RetirementVisual,
  SalaryVisual,
} from "@/components/home/Illustrations";
import { useT } from "@/lib/i18n";
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

const CARDS: {
  step: number;
  to: "/mzda" | "/duchod" | "/invest" | "/mortgage" | "/plan";
  title: string;
  subtitle: string;
  Visual: ComponentType;
}[] = [
  {
    step: 1,
    to: "/mzda",
    title: "Salary",
    subtitle: "Turn your gross salary into net pay: tax, insurance and child benefit, 2026 rules.",
    Visual: SalaryVisual,
  },
  {
    step: 2,
    to: "/duchod",
    title: "Retirement",
    subtitle: "When you'll retire, your state pension and what DPS and DIP add.",
    Visual: RetirementVisual,
  },
  {
    step: 3,
    to: "/invest",
    title: "Invest",
    subtitle:
      "See how monthly contributions compound over time — and what they're worth in today's money.",
    Visual: InvestVisual,
  },
  {
    step: 4,
    to: "/mortgage",
    title: "Mortgage",
    subtitle: "Compare your current rate against a what-if rate and see what it really costs.",
    Visual: MortgageVisual,
  },
  {
    step: 5,
    to: "/plan",
    title: "Independence",
    subtitle: "Answer a few quick questions and find out when you can realistically stop working.",
    Visual: PlanVisual,
  },
];

const JOURNEY = ["Salary", "Retirement", "Invest", "Mortgage", "Independence", "Dashboard"] as const;

function Home() {
  const { t } = useT();

  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <p className="text-sm font-medium text-primary">{t("Your money, in one picture")}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("See where your money is heading.")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t(
            "Money Kalkulačka is a set of quick, private calculators. Each tab answers one question — together they build your personal dashboard. Everything stays in your browser.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            to="/mzda"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("Start with Salary")}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("Jump to Dashboard")}
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="mr-1">{t("Ideal journey")}:</span>
          {JOURNEY.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span
                className={
                  step === "Dashboard"
                    ? "rounded-full bg-accent-soft px-2.5 py-0.5 font-medium text-primary"
                    : "font-medium text-foreground"
                }
              >
                {t(step)}
              </span>
              {i < JOURNEY.length - 1 && <ChevronRight className="size-4" />}
            </span>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {CARDS.map(({ step, to, title, subtitle, Visual }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="relative h-40 bg-accent-soft px-8 py-6">
                <span className="absolute left-4 top-4 flex size-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground shadow-sm">
                  {step}
                </span>
                <Visual />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h2 className="flex items-center justify-between text-xl font-semibold tracking-tight text-foreground">
                  {t(title)}
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(subtitle)}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          {t("Your numbers carry across tabs and come together on the")}{" "}
          <Link to="/dashboard" className="font-medium text-primary hover:underline">
            {t("Dashboard")}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
