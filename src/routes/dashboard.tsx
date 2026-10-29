import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/Panel";
import { SnapshotBar } from "@/components/dashboard/SnapshotBar";
import { useCurrency, useFormatters } from "@/lib/currency";
import {
  deriveMetrics,
  loadDashboard,
  loadInvest,
  loadMortgage,
  saveDashboard,
  type DashboardMetrics,
  type DashboardStore,
  type PathRow,
} from "@/lib/dashboard";
import { useT } from "@/lib/i18n";
import { loadPlan } from "@/lib/plan";
import { SALARY_KEY, calcSalary, formatCzk, parseSalaryStore } from "@/lib/salary";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Přehled financí — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Celý obraz vašich financí na jedné stránce: čisté jmění, míra spoření a kam směřujete — sestavené ze záložek Mzda, Investice, Hypotéka a Plán.",
      },
      { property: "og:title", content: "Přehled financí — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Čisté jmění, míra spoření a připravenost na důchod, přímo z ostatních záložek.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  caption,
  action,
  accent,
}: {
  label: string;
  value: string;
  caption?: string | undefined;
  action?: ReactNode;
  accent?: boolean;
}) {
  const len = value.length;
  const size =
    len > 16
      ? "text-[clamp(1.05rem,1.6vw,1.4rem)]"
      : len > 13
        ? "text-[clamp(1.2rem,2vw,1.7rem)]"
        : "text-[clamp(1.4rem,2.4vw,2rem)]";
  return (
    <div className="rounded-lg border border-border bg-card p-5 print:p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tnum mt-2 whitespace-nowrap font-semibold tracking-tight",
          size,
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
      {action && <p className="mt-2 text-xs font-medium print:hidden">{action}</p>}
    </div>
  );
}

function RetirementPathChart({ m }: { m: DashboardMetrics }) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  const { path, target, targetAge, livingAge, debtFreeAge } = m;
  const showDebt = path.some((r) => r.debt > 0.5);
  const living = livingAge !== null ? path.find((r) => r.age === livingAge) : undefined;
  const debtFree =
    showDebt && debtFreeAge !== null && debtFreeAge !== livingAge
      ? path.find((r) => r.age === debtFreeAge)
      : undefined;
  const labelStyle = { fill: "var(--muted-foreground)", fontSize: 12 };

  return (
    <div className="h-[300px] w-full print:h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={path} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="age"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => compact(v)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PathRow;
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-2 font-semibold">{t("Age {n}", { n: String(label) })}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Pot")}</dt>
                      <dd className="font-medium text-primary">{money(p.pot)}</dd>
                    </div>
                    {target !== null && (
                      <div className="flex justify-between gap-6">
                        <dt className="text-muted-foreground">{t("Your number")}</dt>
                        <dd>{money(target)}</dd>
                      </div>
                    )}
                    {p.debt > 0.5 && (
                      <div className="flex justify-between gap-6">
                        <dt className="text-muted-foreground">{t("Mortgage left")}</dt>
                        <dd>{money(p.debt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="pot"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.15}
            animationDuration={200}
          />
          {showDebt && (
            <Line
              type="monotone"
              dataKey="need"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={false}
              activeDot={false}
              animationDuration={200}
            />
          )}
          {target !== null && (
            <ReferenceLine
              y={target}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
            />
          )}
          <ReferenceLine
            x={targetAge}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={(props: { viewBox?: { x?: number; y?: number } }) => {
              // Left of the line, so it never runs off the right edge.
              const { x = 0, y = 0 } = props.viewBox ?? {};
              return (
                <text x={x - 6} y={y + 12} textAnchor="end" {...labelStyle}>
                  {t("Target age {n}", { n: targetAge })}
                </text>
              );
            }}
          />
          {target !== null && living && living.age > path[0]!.age && (
            <ReferenceDot
              x={living.age}
              y={target}
              r={5}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={2}
              label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                const { x = 0, y = 0, width = 0 } = props.viewBox ?? {};
                return (
                  <text
                    x={x + width / 2}
                    y={y + 22}
                    textAnchor="middle"
                    fill="var(--accent)"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {living.age}
                  </text>
                );
              }}
            />
          )}
          {debtFree && (
            <ReferenceDot
              x={debtFree.age}
              y={debtFree.need}
              r={5}
              fill="var(--foreground)"
              stroke="var(--background)"
              strokeWidth={2}
              label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                const { x = 0, y = 0, width = 0 } = props.viewBox ?? {};
                return (
                  <text
                    x={x + width / 2}
                    y={y - 10}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {debtFree.age}
                  </text>
                );
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value, caption }: { label: string; value: string; caption?: string | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,2vw,1.75rem)] font-semibold leading-tight tracking-tight">
        {value}
      </p>
      {caption && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>}
    </div>
  );
}

/** The plan's headline: when you can stop, what you need, and where you end up. */
function Headline({ m, spend }: { m: DashboardMetrics; spend: number }) {
  const { money } = useFormatters();
  const { t } = useT();
  const owes = m.livingAge !== null && m.owedAtLiving > 0.5;
  const o = m.outlook;
  const outlookCaption = !o
    ? undefined
    : o.debt > 0.5
      ? o.clearable
        ? o.home > 0
          ? t("Clear the mortgage and the home is fully yours.")
          : t("Enough to clear the mortgage too.")
        : t("With {d} still owed on the mortgage.", { d: money(o.debt) })
      : m.mortgageBalance > 0
        ? o.home > 0
          ? t("Home fully yours.")
          : t("Mortgage paid off.")
        : undefined;

  return (
    <section className="break-inside-avoid rounded-lg border border-border bg-card p-6 print:p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("Where you're headed")}
      </p>
      <h2
        className={cn(
          "mt-2 max-w-3xl text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight",
          m.livingAge !== null && "text-primary",
        )}
      >
        {m.livingAge === null
          ? t("On this path your pot doesn't reach your number before 90.")
          : t("From {a} you could live on {v} a month.", { a: m.livingAge, v: money(spend) })}
      </h2>
      {owes && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {m.debtFreeAge !== null
            ? t("You'd still owe {d} on the mortgage at {age}. Keep going until {age2} to clear it.", {
                d: money(m.owedAtLiving),
                age: m.livingAge!,
                age2: m.debtFreeAge,
              })
            : t("You'd still owe {d} on the mortgage at {age}.", {
                d: money(m.owedAtLiving),
                age: m.livingAge!,
              })}
        </p>
      )}
      <div className="mt-6 grid gap-6 border-t border-border pt-5 sm:grid-cols-3 print:mt-3 print:grid-cols-3 print:pt-3">
        {m.target !== null && (
          <Stat
            label={t("Your number")}
            value={money(m.target)}
            caption={t("The pot that pays {v} a month", { v: money(spend) })}
          />
        )}
        {m.target !== null && owes && (
          <Stat
            label={t("Your number + mortgage left")}
            value={money(m.target + m.owedAtLiving)}
            caption={t("What you'd need at {a} to stop work and clear the mortgage", {
              a: m.livingAge!,
            })}
          />
        )}
        {o && (
          <Stat
            label={t("Net worth at {age}", { age: o.age })}
            value={money(o.netWorth)}
            caption={outlookCaption}
          />
        )}
      </div>
    </section>
  );
}

/** Home, investments and savings, minus the mortgage: today and at the outlook age. */
function WhatYouOwn({ m }: { m: DashboardMetrics }) {
  const { money, percent } = useFormatters();
  const { t } = useT();
  const o = m.outlook;
  const gross = m.homeValue + m.invested + m.cash;
  const rows = [
    { key: "home", label: t("Your home"), color: "bg-foreground", now: m.homeValue, later: o?.home ?? 0 },
    { key: "invest", label: t("Investments"), color: "bg-primary", now: m.invested, later: o?.invested ?? 0 },
    { key: "cash", label: t("Savings account"), color: "bg-primary/40", now: m.cash, later: o?.cash ?? 0 },
  ].filter((r) => r.now > 0 || r.later > 0.5);
  const showDebt = m.mortgageBalance > 0 || (o?.debt ?? 0) > 0.5;

  return (
    <Panel title={t("What you own")} className="break-inside-avoid">
      {gross > 0 && (
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {rows.map((r) => (
            <div key={r.key} className={r.color} style={{ width: `${(r.now / gross) * 100}%` }} />
          ))}
        </div>
      )}
      <table className="tnum mt-4 w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="pb-2 text-left font-medium" />
            <th className="pb-2 text-right font-medium">{t("Today")}</th>
            {o && <th className="pb-2 pl-4 text-right font-medium">{t("At {age}", { age: o.age })}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-1.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn("size-2.5 shrink-0 rounded-sm", r.color)} />
                  {r.label}
                  {gross > 0 && r.now > 0 && (
                    <span className="text-xs">{percent((r.now / gross) * 100)}</span>
                  )}
                </span>
              </td>
              <td className="py-1.5 text-right font-medium">{money(r.now)}</td>
              {o && <td className="py-1.5 pl-4 text-right text-muted-foreground">{money(r.later)}</td>}
            </tr>
          ))}
          {showDebt && (
            <tr>
              <td className="py-1.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-sm border border-border" />
                  {t("Mortgage")}
                </span>
              </td>
              <td className="py-1.5 text-right font-medium">−{money(m.mortgageBalance)}</td>
              {o && (
                <td className="py-1.5 pl-4 text-right text-muted-foreground">
                  {o.debt > 0.5 ? `−${money(o.debt)}` : money(0)}
                </td>
              )}
            </tr>
          )}
          <tr className="border-t border-border font-semibold">
            <td className="pt-2.5">{t("Net worth")}</td>
            <td className="pt-2.5 text-right">{money(m.netWorth)}</td>
            {o && <td className="pt-2.5 pl-4 text-right">{money(o.netWorth)}</td>}
          </tr>
        </tbody>
      </table>
      {m.homeValue === 0 && m.mortgageBalance > 0 ? (
        <Link
          to="/mortgage"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline print:hidden"
        >
          {t("Add your home's value →")}
        </Link>
      ) : (
        o && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("Future values in today's money.")}
          </p>
        )
      )}
    </Panel>
  );
}

function Dashboard() {
  const { t, count, locale } = useT();
  const { money, percent } = useFormatters();
  const [store, setStore] = useState<DashboardStore>({ income: 0 });
  const [hydrated, setHydrated] = useState(false);
  const { currency } = useCurrency();
  const [salaryNet, setSalaryNet] = useState<number | null>(null);
  const [saved, setSaved] = useState<{
    invest: ReturnType<typeof loadInvest>;
    mortgage: ReturnType<typeof loadMortgage>;
    plan: ReturnType<typeof loadPlan>;
  }>({ invest: null, mortgage: null, plan: null });

  useEffect(() => {
    setStore(loadDashboard());
    setSaved({ invest: loadInvest(), mortgage: loadMortgage(), plan: loadPlan() });
    const salary = parseSalaryStore(window.localStorage.getItem(SALARY_KEY));
    setSalaryNet(salary ? calcSalary(salary).payout : null);
    setHydrated(true);
  }, []);

  const update = (p: Partial<DashboardStore>) => {
    setStore((s) => {
      const next = { ...s, ...p };
      saveDashboard(next);
      return next;
    });
  };

  const hasAnyData = Boolean(saved.invest || saved.mortgage || saved.plan || salaryNet !== null);
  const { invest, mortgage, plan } = saved;
  const income = store.income;

  const m = useMemo(
    () => deriveMetrics({ invest, mortgage, plan, income }),
    [invest, mortgage, plan, income],
  );

  if (!hydrated) return null;

  const showEmpty = !hasAnyData;

  const mortgageFreeLabel =
    m.mortgageMonths === null
      ? null
      : m.age !== null
        ? t("Mortgage-free at {age}", { age: Math.round(m.age + m.mortgageMonths / 12) })
        : t("Mortgage-free in {years}", { years: count(Math.ceil(m.mortgageMonths / 12), "year") });

  return (
    <div className="space-y-6 print:space-y-3">
      <SnapshotBar canPrint={hasAnyData} />

      {showEmpty ? (
        <Panel className="py-14 text-center">
          <p className="text-base font-semibold">{t("Nothing here yet")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              "Fill in your numbers in Mzda, Invest, Mortgage and Plan — the dashboard brings them together here.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-medium">
            <Link to="/mzda" className="text-primary hover:underline">
              {t("Calculate your net salary →")}
            </Link>
            <Link to="/invest" className="text-primary hover:underline">
              {t("Set up your investments →")}
            </Link>
            <Link to="/mortgage" className="text-primary hover:underline">
              {t("Set up your mortgage →")}
            </Link>
            <Link to="/plan" className="text-primary hover:underline">
              {t("Answer the plan questions →")}
            </Link>
          </div>
        </Panel>
      ) : (
        <>
          {/* Where you're headed: the headline numbers */}
          {m.path.length > 0 && <Headline m={m} spend={plan?.spend ?? 0} />}

          {/* Where you stand */}
          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">{t("Where you stand")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
              <Kpi
                label={t("Net worth")}
                value={money(m.netWorth)}
                caption={
                  m.homeValue > 0
                    ? t("Home {h} · Investments {a} · Savings {b} · Mortgage −{d}", {
                        h: money(m.homeValue),
                        a: money(m.invested),
                        b: money(m.cash),
                        d: money(m.mortgageBalance),
                      })
                    : m.mortgageBalance > 0
                      ? t("Excluding your home")
                      : t("Invested {a} · Savings {b}", { a: money(m.invested), b: money(m.cash) })
                }
                action={
                  m.homeValue === 0 && m.mortgageBalance > 0 ? (
                    <Link to="/mortgage" className="text-primary hover:underline">
                      {t("Add your home's value →")}
                    </Link>
                  ) : undefined
                }
                accent={m.netWorth >= 0}
              />
              <Kpi
                label={t("Savings rate")}
                value={m.savingsRate !== null ? percent(m.savingsRate * 100) : "—"}
                caption={
                  m.savingsRate !== null ? t("of your monthly income") : t("Add your income below")
                }
              />
              {(m.mortgageBalance > 0 || m.homeValue > 0) && (
                <Kpi
                  label={t("Home ownership")}
                  value={
                    m.ownership !== null
                      ? t("{p} yours", { p: percent(m.ownership * 100) })
                      : (mortgageFreeLabel ?? "—")
                  }
                  caption={
                    m.mortgageBalance <= 0
                      ? t("No mortgage")
                      : m.ownership !== null
                        ? (mortgageFreeLabel ?? t("The payment doesn't pay the loan off"))
                        : m.mortgageMonths !== null
                          ? t("{years} to go", {
                              years: count(Math.ceil(m.mortgageMonths / 12), "year"),
                            })
                          : undefined
                  }
                  action={
                    m.ownership === null ? (
                      <Link to="/mortgage" className="text-primary hover:underline">
                        {t("Add your home's value →")}
                      </Link>
                    ) : undefined
                  }
                />
              )}
              <Kpi
                label={t("Retirement readiness")}
                value={m.readiness !== null ? percent(m.readiness * 100) : "—"}
                caption={
                  m.livingAge !== null
                    ? m.debtFreeAge !== null && m.debtFreeAge !== m.livingAge
                      ? t("From {a} · debt-free from {b}", { a: m.livingAge, b: m.debtFreeAge })
                      : t("Stop work at {age}", { age: m.livingAge })
                    : m.readiness !== null
                      ? t("of your number")
                      : t("Answer the plan questions →")
                }
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
            <WhatYouOwn m={m} />

            {/* Where your money goes */}
            <Panel title={t("Where your money goes")} className="break-inside-avoid">
              <div className="mb-5">
                <label
                  htmlFor="dashboard-income"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {t("Monthly net income")}
                </label>
                <input
                  id="dashboard-income"
                  type="number"
                  min={0}
                  value={store.income || ""}
                  placeholder={money(currency === "CZK" ? 40000 : 3000)}
                  onChange={(e) => update({ income: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="tnum mt-1.5 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t(
                    "What lands in your account each month. Used only for the savings rate — stored in this browser.",
                  )}
                </p>
                {salaryNet !== null && salaryNet > 0 && currency === "CZK" ? (
                  store.income !== salaryNet && (
                    <p className="mt-2 text-sm text-muted-foreground print:hidden">
                      {t("From Mzda: {v}", { v: formatCzk(salaryNet) })} ·{" "}
                      <button
                        type="button"
                        onClick={() => update({ income: salaryNet })}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("Use")}
                      </button>
                    </p>
                  )
                ) : (
                  <Link
                    to="/mzda"
                    className="mt-2 inline-block text-sm font-medium text-primary hover:underline print:hidden"
                  >
                    {t("Calculate from gross salary →")}
                  </Link>
                )}
              </div>
              {m.income > 0 ? (
                <>
                  <div className="flex h-4 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-foreground"
                      style={{ width: `${Math.min(100, (m.mortgagePayment / m.income) * 100)}%` }}
                    />
                    <div
                      className="bg-primary"
                      style={{ width: `${Math.min(100, (m.monthlyInvesting / m.income) * 100)}%` }}
                    />
                    <div
                      className="bg-primary/40"
                      style={{ width: `${Math.min(100, (m.monthlySavings / m.income) * 100)}%` }}
                    />
                    <div className="flex-1 bg-muted" />
                  </div>
                  <dl className="tnum mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-foreground" />
                        {t("Mortgage payment")}
                      </dt>
                      <dd className="font-medium">{money(m.mortgagePayment)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-primary" />
                        {t("Monthly investing")}
                      </dt>
                      <dd className="font-medium">{money(m.monthlyInvesting)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-primary/40" />
                        {t("Monthly savings")}
                      </dt>
                      <dd className="font-medium">{money(m.monthlySavings)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm bg-muted" />
                        {t("Free cash")}
                      </dt>
                      <dd className="font-medium">{money(Math.max(0, m.freeCash ?? 0))}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("Add your income below")}</p>
              )}
            </Panel>
          </div>

          {/* The path to your number */}
          <Panel title={t("Your path to your number")} className="break-inside-avoid">
              {m.path.length > 0 ? (
                <>
                  <RetirementPathChart m={m} />
                  <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm bg-primary/30 ring-1 ring-primary" />{" "}
                      {t("Your pot")}
                    </span>
                    {m.target !== null && (
                      <span className="flex items-center gap-2">
                        <span className="h-0 w-3 border-t-2 border-dashed border-muted-foreground" />{" "}
                        {t("Your number — {v}", { v: money(m.target) })}
                      </span>
                    )}
                    {m.path.some((r) => r.debt > 0.5) && (
                      <span className="flex items-center gap-2">
                        <span className="h-0 w-3 border-t-2 border-dotted border-muted-foreground" />{" "}
                        {t("Your number + mortgage left")}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                    {t(
                      "Answer the plan questions to see when you can stop working — and when the mortgage is cleared too.",
                    )}
                  </p>
                  <Link
                    to="/plan"
                    className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {t("Answer the plan questions →")}
                  </Link>
                </div>
              )}
          </Panel>

          {/* Print-only page 2: the details behind the overview. */}
          <div className="hidden print:block">
            <div className="plan-print-summary-card space-y-5 rounded-lg border border-border p-6 text-sm print:grid print:grid-cols-2 print:gap-x-8 print:gap-y-3 print:space-y-0 print:p-4 print:text-xs">
              <p className="font-semibold tracking-tight print:col-span-2">{t("The details")}</p>
              {[
                {
                  title: t("Investments"),
                  rows: invest
                    ? [
                        [t("Initial amount"), money(invest.initial)],
                        [t("Monthly contribution"), money(invest.monthly)],
                        [t("Expected annual return"), percent(invest.rate)],
                        [t("Investment period"), count(Math.round(invest.years), "year")],
                      ]
                    : null,
                },
                {
                  title: t("Savings account"),
                  rows:
                    invest && invest.savings
                      ? [
                          [t("Initial amount"), money(invest.sInitial)],
                          [t("Monthly deposit"), money(invest.sMonthly)],
                          [t("Interest rate"), percent(invest.sRate)],
                        ]
                      : null,
                },
                {
                  title: t("Mortgage"),
                  rows: mortgage
                    ? [
                        [t("Loan amount"), money(mortgage.principal)],
                        [t("Interest rate"), percent(mortgage.rate)],
                        [t("Mortgage payment"), money(m.mortgagePayment)],
                        [
                          t("Term"),
                          m.mortgageMonths !== null
                            ? count(Math.ceil(m.mortgageMonths / 12), "year")
                            : "—",
                        ],
                        ...(mortgage.homeValue > 0
                          ? [
                              [t("Property value"), money(mortgage.homeValue)],
                              [
                                t("Price growth above inflation"),
                                mortgage.homeGrowth ? percent(mortgage.homeRate) : t("Off"),
                              ],
                            ]
                          : []),
                      ]
                    : null,
                },
                {
                  title: t("Plan"),
                  rows: plan
                    ? [
                        [t("Age"), String(plan.age)],
                        [t("Target age"), String(plan.stop)],
                        [t("Monthly spending"), money(plan.spend)],
                        [t("Withdrawal rate"), percent(plan.wd)],
                        [t("Inflation"), percent(plan.infl)],
                      ]
                    : null,
                },
                {
                  title: t("Plan — investments"),
                  rows: plan
                    ? [
                        [t("Invested today"), money(plan.invested)],
                        [t("Invested monthly"), money(plan.saveInvest)],
                        [t("Investment return"), percent(plan.ret)],
                      ]
                    : null,
                },
                {
                  title: t("Plan — savings"),
                  rows: plan
                    ? [
                        [t("In savings today"), money(plan.cash)],
                        [t("Saved monthly"), money(plan.saveCash)],
                        [t("Savings interest rate"), percent(plan.cashRet)],
                      ]
                    : null,
                },
                {
                  title: t("Monthly net income"),
                  rows: income > 0 ? [[t("Monthly net income"), money(income)]] : null,
                },
              ]
                .filter((sec) => sec.rows)
                .map((sec) => (
                  <div key={sec.title}>
                    <p className="font-semibold">{sec.title}</p>
                    <dl className="tnum mt-2 grid grid-cols-2 gap-x-8 gap-y-1.5 print:mt-1 print:grid-cols-1 print:gap-y-0.5">
                      {sec.rows!.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              <p className="text-xs text-muted-foreground print:col-span-2">
                {t("Made with Money Kalkulačka · {date}", {
                  date: new Date().toLocaleDateString(locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                })}
              </p>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground print:col-span-2 print:mt-0">
                {t(
                  "Money Kalkulačka does arithmetic, not advice. These are projections based on assumptions you can change — not a prediction, and not a recommendation to buy or sell anything.",
                )}
              </p>
            </div>
          </div>

          {/* Missing-data hints */}
          {(!saved.invest || !saved.mortgage || !saved.plan) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium print:hidden">
              {!saved.invest && (
                <Link to="/invest" className="text-primary hover:underline">
                  {t("Set up your investments →")}
                </Link>
              )}
              {!saved.mortgage && (
                <Link to="/mortgage" className="text-primary hover:underline">
                  {t("Set up your mortgage →")}
                </Link>
              )}
              {!saved.plan && (
                <Link to="/plan" className="text-primary hover:underline">
                  {t("Answer the plan questions →")}
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
