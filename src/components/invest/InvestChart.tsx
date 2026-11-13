import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { growthCrossoverYear, type InvestYear } from "@/lib/finance";
import { AXIS_TICK, CROSSHAIR, TOOLTIP_BOX, gradientId } from "@/lib/chartStyle";
import { useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export function InvestChart({ rows }: { rows: InvestYear[] }) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  const uid = useId();
  const growthFill = gradientId("growth", uid);
  const putInFill = gradientId("putin", uid);

  const data = rows.map((r) => ({
    year: r.year,
    contributed: r.totalContributed,
    growth: Math.max(0, r.growth),
    total: r.balance,
  }));
  const last = data[data.length - 1];
  const crossover = growthCrossoverYear(rows);

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 28, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={growthFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id={putInFill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neutral-fill)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--neutral-fill)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tick={AXIS_TICK}
            tickFormatter={(v: number) => compact(v)}
          />
          <Tooltip
            cursor={CROSSHAIR}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as (typeof data)[number];
              return (
                <div className={TOOLTIP_BOX}>
                  <p className="mb-2 font-semibold">{t("Year {n}", { n: String(label) })}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Total")}</dt>
                      <dd className="font-medium">{money(p.total)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Contributed")}</dt>
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
            stroke="var(--muted-foreground)"
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="5 4"
            fill={`url(#${putInFill})`}
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
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: "var(--accent)" }}
          />
          {crossover !== null && crossover < (last?.year ?? 0) && (
            <ReferenceLine
              x={crossover}
              stroke="var(--warning)"
              strokeDasharray="3 4"
              label={(props: { viewBox?: { x?: number; y?: number } }) => {
                const { x = 0, y = 0 } = props.viewBox ?? {};
                return (
                  <text
                    x={x - 6}
                    y={y + 12}
                    textAnchor="end"
                    fill="var(--warning-deep)"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {t("Year {n}: growth passes deposits", { n: crossover })}
                  </text>
                );
              }}
            />
          )}
          {last && (
            <ReferenceDot
              x={last.year}
              y={last.total}
              r={5}
              fill="var(--accent)"
              stroke="var(--card)"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                const { x = 0, y = 0, width = 0 } = props.viewBox ?? {};
                return (
                  <text
                    x={x + width / 2}
                    y={y - 12}
                    textAnchor="end"
                    fill="var(--primary-deep)"
                    fontSize={13}
                    fontWeight={700}
                  >
                    {compact(last.total)}
                  </text>
                );
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
