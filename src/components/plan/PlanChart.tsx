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
};

export function PlanChart({ rows, target, stopAge, reachedAge, debtFreeAge = null, markers = [] }: Props) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  const showTarget = isFinite(target);
  const showDebt = showTarget && rows.some((r) => r.debt > 0.5);
  const data: (PlanYearRow & { need?: number })[] = showDebt ? rows.map((r) => ({ ...r, need: target + r.debt })) : rows;
  const reachedRow = reachedAge !== null ? rows.find((r) => r.age === reachedAge) : undefined;
  const debtFreeRow =
    showDebt && debtFreeAge !== null && debtFreeAge !== reachedAge
      ? data.find((r) => r.age === debtFreeAge)
      : undefined;

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
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
              (dataMax: number) => Math.max(dataMax, showTarget ? target + (showDebt ? (rows[0]?.debt ?? 0) : 0) : 0) * 1.05,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as PlanYearRow;
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
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
                      <dd className="text-primary">{money(p.growth)}</dd>
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
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.18}
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
          {showTarget && (
            <ReferenceLine
              y={target}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 4"
              label={{
                value: t("Your number — {v}", { v: money(target) }),
                position: "insideTopRight",
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
              y={target}
              r={5}
              fill="var(--accent)"
              stroke="var(--background)"
              strokeWidth={2}
              label={{
                value: t("{n} — you reach your number", { n: reachedRow.age }),
                // Below the dot when the debt-free dot sits just above it.
                position: debtFreeRow ? "bottom" : "top",
                fill: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
              }}
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
