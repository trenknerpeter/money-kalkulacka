import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MortgageYear } from "@/lib/finance";
import { useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";

export function PaymentBreakdownChart({ rows }: { rows: MortgageYear[] }) {
  const { money, compact } = useFormatters();
  const { t } = useT();

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickMargin={10}
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: number) => compact(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as MortgageYear;
              return (
                <div className="rounded-md border border-border bg-card p-3 text-xs">
                  <p className="mb-2 font-semibold">{t("Year {n}", { n: String(label) })}</p>
                  <dl className="tnum space-y-1">
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Principal")}</dt>
                      <dd className="font-medium">{money(row.principalPaid)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{t("Interest")}</dt>
                      <dd className="font-medium">{money(row.interestPaid)}</dd>
                    </div>
                  </dl>
                </div>
              );
            }}
          />
          <Bar
            dataKey="principalPaid"
            name="Principal"
            fill="var(--accent)"
            radius={[2, 2, 0, 0]}
            animationDuration={200}
          />
          <Bar
            dataKey="interestPaid"
            name="Interest"
            fill="var(--info)"
            radius={[2, 2, 0, 0]}
            animationDuration={200}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}