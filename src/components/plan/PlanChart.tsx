import { useId } from "react";
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
import { pointLabel } from "@/components/chartLabels";
import { CROSSHAIR, TOOLTIP_BOX, gradientId } from "@/lib/chartStyle";
import { useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { PlanYearRow } from "@/lib/plan";

type Props = {
  rows: PlanYearRow[];
  target: number;
  stopAge: number;
  reachedAge: number | null;
  /** Age the pot also covers the remaining mortgage, when there is one. */
  debtFreeAge?: number | null;
  /** Dashed vertical lines with a small label, e.g. when DPS/DIP open or the state pension starts. */
  markers?: { age: number; label: string }[];
  /** The number needed at each age, when it changes with the age you stop (pension on). Drawn as a line instead of a flat one. */
  needAt?: ((age: number) => number) | undefined;
};

export function PlanChart({
  rows,
  target,
  stopAge,
  reachedAge,
  debtFreeAge = null,
  markers = [],
  needAt,
}: Props) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  const uid = useId();
  const growthFill = gradientId("plan-growth", uid);
  const showTarget = isFinite(target);
  const showDebt = showTarget && rows.some((r) => r.debt > 0.5);
  const data: (PlanYearRow & { need?: number; number?: number })[] =
    showDebt || needAt
      ? rows.map((r) => {
          const n = needAt ? needAt(r.age) : target;
          return {
            ...r,
            ...(needAt ? { number: n } : {}),
            ...(showDebt ? { need: n + r.debt } : {}),
          };
        })
      : rows;
  const reachedRow = reachedAge !== null ? rows.find((r) => r.age === reachedAge) : undefined;
  const reachedY = needAt && reachedRow ? needAt(reachedRow.age) : target;
  const debtFreeRow =
    showDebt && debtFreeAge !== null && debtFreeAge !== reachedAge
      ? data.find((r) => r.age === debtFreeAge)
      : undefined;

  const first = data[0];
  const last = data[data.length - 1];
  // Name the green band where it is tall and clear of the other markers and end labels.
  const avoid = [reachedAge, stopAge, debtFreeAge, ...markers.map((m) => m.age)].filter(
    (a): a is number => typeof a === "number",
  );
  const span = last && first ? last.age - first.age : 0;
  const growthLabelAt =
    last && first
      ? data
          .filter(
            (d) =>
              d.age >= first.age + span * 0.45 &&
              d.age <= last.age - 4 &&
              avoid.every((a) => Math.abs(a - d.age) > 3) &&
              d.growth / Math.max(1, last.balance) > 0.1,
          )
          .sort((a, b) => b.growth - a.growth)[0]
      : undefined;

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={growthFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
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
            domain={[
              0,
              (dataMax: number) =>
                Math.max(
                  dataMax,
                  showTarget && !needAt ? target + (showDebt ? (rows[0]?.debt ?? 0) : 0) : 0,
                ) * 1.05,
            ]}
          />
          <Tooltip
            cursor={CROSSHAIR}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PlanYearRow;
              return (
                <div className={TOOLTIP_BOX}>
                  <p className="mb-2 font-semibold">{t("Age {n}", { n: String(label) })}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Pot")}</dt>
                      <dd className="font-medium">{money(p.balance)}</dd>
                    </div>
                    {p.savings > 0 && (
                      <>
                        <div className="flex justify-between gap-6 pl-3">
                          <dt className="text-muted-foreground">{t("Investments")}</dt>
                          <dd>{money(p.invest)}</dd>
                        </div>
                        <div className="flex justify-between gap-6 pl-3">
                          <dt className="text-muted-foreground">{t("Savings")}</dt>
                          <dd>{money(p.savings)}</dd>
                        </div>
                      </>
                    )}
                    {p.debt > 0.5 && (
                      <div className="flex justify-between gap-6">
                        <dt className="text-muted-foreground">{t("Mortgage left")}</dt>
                        <dd>{money(p.debt)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Put in")}</dt>
                      <dd>{money(p.contributed)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Growth")}</dt>
                      <dd className="text-primary-deep">{money(p.growth)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="contributed"
            stackId="1"
            stroke="var(--neutral-fill)"
            strokeWidth={1}
            fill="var(--neutral-fill)"
            fillOpacity={1}
            animationDuration={200}
          />
          <Area
            type="monotone"
            dataKey="growth"
            stackId="1"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill={`url(#${growthFill})`}
            fillOpacity={1}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--foreground)"
            strokeWidth={1.5}
            dot={false}
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
          {showTarget && needAt && (
            <Line
              type="monotone"
              dataKey="number"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              animationDuration={200}
            />
          )}
          {showTarget && !needAt && (
            <ReferenceLine
              y={target}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              label={{
                value: t("Your number — {v}", { v: money(target) }),
                position: "insideBottomLeft",
                fill: "var(--muted-foreground)",
                fontSize: 12,
              }}
            />
          )}
          <ReferenceLine
            x={stopAge}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
            label={{
              value: t("Target age {n}", { n: stopAge }),
              position: "insideTopLeft",
              fill: "var(--muted-foreground)",
              fontSize: 12,
            }}
          />
          {markers.map((m) => (
            <ReferenceLine
              key={`${m.age}-${m.label}`}
              x={m.age}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              label={{
                value: m.label,
                position: "insideBottomRight",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
          ))}
          {showTarget && reachedRow && (
            <ReferenceDot
              x={reachedRow.age}
              y={reachedY}
              r={5}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: t("{n} — you reach your number", { n: reachedRow.age }),
                // Below the dot when the debt-free dot sits just above it.
                position: debtFreeRow ? "bottom" : "top",
                fill: "var(--primary-deep)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}
          {last && (
            <ReferenceDot
              x={last.age}
              y={last.balance}
              r={0}
              ifOverflow="extendDomain"
              label={pointLabel(`${t("Pot")} ${compact(last.balance)}`, {
                fill: "var(--primary-deep)",
                dy: -10,
                weight: 700,
              })}
            />
          )}
          {last && last.growth / Math.max(1, last.balance) > 0.08 && (
            <ReferenceDot
              x={last.age}
              y={last.contributed}
              r={0}
              ifOverflow="extendDomain"
              label={pointLabel(`${t("Money you put in")} ${compact(last.contributed)}`, {
                fill: "var(--foreground)",
                dy: -8,
              })}
            />
          )}
          {growthLabelAt && (
            <ReferenceDot
              x={growthLabelAt.age}
              y={growthLabelAt.contributed + growthLabelAt.growth / 2}
              r={0}
              label={pointLabel(t("Growth"), {
                fill: "var(--primary-deep)",
                anchor: "middle",
                dy: 4,
              })}
            />
          )}
          {showTarget && needAt && last?.number !== undefined && (
            <ReferenceDot
              x={last.age}
              y={last.number}
              r={0}
              ifOverflow="extendDomain"
              label={pointLabel(t("Your number at each age"), {
                fill: "var(--muted-foreground)",
                dy: -8,
                weight: 500,
              })}
            />
          )}
          {showDebt && first?.need !== undefined && (
            <ReferenceDot
              x={first.age}
              y={first.need}
              r={0}
              ifOverflow="extendDomain"
              label={pointLabel(t("Your number + mortgage left"), {
                fill: "var(--muted-foreground)",
                anchor: "start",
                dx: 6,
                dy: -8,
                weight: 500,
              })}
            />
          )}
          {debtFreeRow?.need !== undefined && (
            <ReferenceDot
              x={debtFreeRow.age}
              y={debtFreeRow.need}
              r={5}
              fill="var(--foreground)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: t("{n} — mortgage cleared too", { n: debtFreeRow.age }),
                position: "top",
                fill: "var(--foreground)",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
