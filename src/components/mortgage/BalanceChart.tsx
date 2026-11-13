import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { pointLabel } from "@/components/chartLabels";
import { AXIS_TICK, CROSSHAIR, TOOLTIP_BOX } from "@/lib/chartStyle";
import { useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export function BalanceChart({ current, whatIf }: { current: number[]; whatIf: number[] }) {
  const { money, compact } = useFormatters();
  const { t } = useT();
  const length = Math.max(current.length, whatIf.length);
  const data = Array.from({ length }, (_, i) => ({
    year: i,
    current: current[i] ?? 0,
    whatIf: whatIf[i] ?? 0,
  }));

  // Name both lines a little way in, the upper one above and the lower one below.
  const at = data[Math.max(1, Math.floor(length * 0.4))];
  const whatIfAbove = at ? at.whatIf >= at.current : true;

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      <dt className="text-muted-foreground">{t("Current")}</dt>
                      <dd className="font-medium">{money(p.current)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("What-if")}</dt>
                      <dd className="text-info-deep">{money(p.whatIf)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="var(--foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="whatIf"
            stroke="var(--info)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="6 5"
            dot={false}
            activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={200}
          />
          {at && (
            <ReferenceDot
              x={at.year}
              y={at.current}
              r={0}
              label={pointLabel(t("Now"), {
                fill: "var(--foreground)",
                anchor: "middle",
                dy: whatIfAbove ? 20 : -12,
              })}
            />
          )}
          {at && (
            <ReferenceDot
              x={at.year}
              y={at.whatIf}
              r={0}
              label={pointLabel(t("What-if"), {
                fill: "var(--info-deep)",
                anchor: "middle",
                dy: whatIfAbove ? -12 : 20,
              })}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
