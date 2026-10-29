import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AlertTriangle, Info } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { NumberSlider } from "@/components/NumberSlider";
import { Panel } from "@/components/Panel";
import { Switch } from "@/components/ui/switch";
import { useCurrency } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import {
  CZ_2026,
  SALARY_DEFAULTS,
  SALARY_KEY,
  calcSalary,
  formatCzk,
  normalizeInput,
} from "@/lib/salary";
import { useScenario } from "@/lib/useScenario";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mzda")({
  head: () => ({
    meta: [
      { title: "Kalkulačka čisté mzdy 2026 — Money Kalkulačka" },
      {
        name: "description",
        content:
          "Spočítejte si čistou mzdu z hrubé pro rok 2026: daň, sociální a zdravotní pojištění, slevy a zvýhodnění na děti. Zdarma, bez registrace.",
      },
      { property: "og:title", content: "Kalkulačka čisté mzdy 2026 — Money Kalkulačka" },
      {
        property: "og:description",
        content: "Z hrubé na čistou za pár vteřin. Vše se počítá ve vašem prohlížeči.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mzda,
});

const DISABILITY_OPTIONS = [
  { label: "None", value: 0 },
  { label: "Degree I–II", value: 1 },
  { label: "Degree III", value: 3 },
] as const;

function Mzda() {
  const [raw, patch] = useScenario(SALARY_KEY, SALARY_DEFAULTS);
  // Shared links and storage can hold anything; show and keep only clamped values.
  const s = useMemo(() => normalizeInput(raw), [raw]);
  useEffect(() => {
    if ((Object.keys(s) as (keyof typeof s)[]).some((k) => s[k] !== raw[k])) patch(s);
  }, [s, raw, patch]);
  const { currency } = useCurrency();
  const { t } = useT();
  const r = useMemo(() => calcSalary(s), [s]);

  // The bar splits gross, so its net segment leaves out the child bonus.
  const parts = [
    {
      key: "net",
      label: t("Net"),
      value: Math.max(0, r.net - r.childBenefit.bonus),
      className: "bg-primary",
    },
    {
      key: "insurance",
      label: t("Insurance"),
      value: r.social + r.health,
      className: "bg-primary/40",
    },
    { key: "tax", label: t("Tax"), value: r.tax, className: "bg-foreground/70" },
  ];
  const partsTotal = Math.max(
    1,
    parts.reduce((sum, p) => sum + p.value, 0),
  );

  const rows: { label: string; value: number; strong?: boolean }[] = [
    { label: t("Gross salary"), value: r.gross },
    { label: t("Social insurance"), value: -r.social },
    { label: t("Health insurance"), value: -r.health },
    { label: t("Tax before credits"), value: -r.taxBeforeCredits },
  ];
  if (r.credits.payer) rows.push({ label: t("Taxpayer credit"), value: r.credits.payer });
  if (r.credits.disability)
    rows.push({ label: t("Disability credit"), value: r.credits.disability });
  if (r.credits.ztp) rows.push({ label: t("ZTP/P credit"), value: r.credits.ztp });
  if (r.childBenefit.total) rows.push({ label: t("Child benefit"), value: r.childBenefit.total });
  rows.push({ label: t("Income tax"), value: -r.tax });
  if (r.childBenefit.bonus) rows.push({ label: t("Child bonus"), value: r.childBenefit.bonus });
  rows.push(
    r.owed > 0
      ? { label: t("You owe"), value: -r.owed, strong: true }
      : { label: t("Net salary"), value: r.payout, strong: true },
  );

  const bonusThreshold = CZ_2026.minWage / 2;
  const bonusBlocked = s.signed && s.kids > 0 && r.gross > 0 && r.gross < bonusThreshold;

  return (
    <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
      <div className="lg:sticky lg:top-32 lg:-mx-1 lg:max-h-[calc(100dvh-9.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
        <Panel className="space-y-6">
          <NumberSlider
            label={t("Gross monthly salary")}
            value={s.gross}
            onChange={(v) => patch({ gross: Math.round(v) })}
            min={0}
            max={300000}
            step={500}
            suffix="Kč"
          />

          <div>
            <div className="flex min-h-11 items-center justify-between gap-4">
              <label htmlFor="signed" className="text-sm font-semibold">
                {t("Signed tax declaration")}
              </label>
              <Switch
                id="signed"
                checked={s.signed}
                onCheckedChange={(checked) => patch({ signed: checked })}
              />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("Without it, no tax credits or child benefit are applied each month.")}
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <NumberSlider
              label={t("Children")}
              value={s.kids}
              onChange={(v) => {
                const kids = Math.min(6, Math.round(v));
                patch({ kids, kidsZtp: Math.min(s.kidsZtp, kids) });
              }}
              min={0}
              max={6}
              step={1}
            />
            {s.kids > 0 && (
              <NumberSlider
                label={t("of which with ZTP/P card")}
                value={s.kidsZtp}
                onChange={(v) => patch({ kidsZtp: Math.min(s.kids, Math.round(v)) })}
                min={0}
                max={s.kids}
                step={1}
              />
            )}
          </div>

          <Accordion type="single" collapsible className="border-t border-border">
            <AccordionItem value="other" className="border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                {t("Other discounts")}
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">{t("Disability pension")}</p>
                  <div className="flex rounded-md border border-border p-0.5">
                    {DISABILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patch({ disability: opt.value })}
                        className={cn(
                          "min-h-9 flex-1 rounded px-3 py-1.5 text-sm leading-tight transition-colors",
                          s.disability === opt.value
                            ? "bg-secondary font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t(opt.label)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex min-h-11 items-center justify-between gap-4">
                  <label htmlFor="ztp" className="text-sm">
                    {t("ZTP/P card holder")}
                  </label>
                  <Switch
                    id="ztp"
                    checked={s.ztp}
                    onCheckedChange={(checked) => patch({ ztp: checked })}
                  />
                </div>
                <div>
                  <div className="flex min-h-11 items-center justify-between gap-4">
                    <label htmlFor="exempt" className="text-sm">
                      {t("Exempt from the minimum health insurance base")}
                    </label>
                    <Switch
                      id="exempt"
                      checked={s.exempt}
                      onCheckedChange={(checked) => patch({ exempt: checked })}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t(
                      "Students, pensioners, people on parental leave and others don't top up health insurance when they earn less than the minimum wage.",
                    )}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Panel>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{t("Net salary")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Gross to net for Czech employees, 2026 rules.")}
              </p>
            </div>
            <CopyLinkButton />
          </div>
          {currency !== "CZK" && (
            <div
              role="note"
              className="flex items-start gap-2.5 rounded-md bg-accent-soft px-4 py-3 text-sm text-primary"
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                {t(
                  "Salaries are calculated in Czech crowns (Kč) under 2026 Czech rules. Your other tabs stay in {currency}.",
                  { currency },
                )}
              </p>
            </div>
          )}
        </div>

        <Panel>
          <p className="tnum text-4xl font-semibold tracking-tight">{formatCzk(r.payout)}</p>
          {r.owed > 0 && (
            <div className="mt-3 flex items-start gap-3 rounded-md border border-negative/30 bg-negative/5 p-4 text-sm text-negative">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                {t(
                  "The health insurance top-up is more than your pay. Nothing is paid out and you still owe {v}, which you settle with your employer.",
                  { v: formatCzk(r.owed) },
                )}
              </p>
            </div>
          )}
          {r.childBenefit.bonus > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("including child bonus {v}", { v: formatCzk(r.childBenefit.bonus) })}
            </p>
          )}

          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-secondary">
            {parts.map((p) => (
              <div
                key={p.key}
                className={p.className}
                style={{ width: `${(p.value / partsTotal) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {parts.map((p) => (
              <span key={p.key} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", p.className)} />
                {p.label} <span className="tnum">{formatCzk(p.value)}</span>
              </span>
            ))}
          </div>

          <dl className="mt-6 divide-y divide-border text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between py-2">
                <dt className={row.strong ? "font-semibold" : "text-muted-foreground"}>
                  {row.label}
                </dt>
                <dd className={cn("tnum", row.strong && "font-semibold")}>
                  {formatCzk(row.value)}
                </dd>
              </div>
            ))}
          </dl>

          {r.healthTopUp > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t(
                "Health insurance includes a {v} top-up to the minimum base (salary below {min}). Students, pensioners and some others are exempt: see Other discounts.",
                { v: formatCzk(r.healthTopUp), min: formatCzk(CZ_2026.minWage) },
              )}
            </p>
          )}
          {bonusBlocked && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("Child bonus is paid only from a monthly salary of {v}.", {
                v: formatCzk(bonusThreshold),
              })}
            </p>
          )}
          {r.aboveSocialCap && (
            <p className="mt-4 text-xs text-muted-foreground">
              {t(
                "Above the annual social insurance cap ({v}): over a full year part of your salary won't be charged social insurance, so real net pay will be a little higher.",
                { v: formatCzk(CZ_2026.socialCapYearly) },
              )}
            </p>
          )}
        </Panel>

        <Panel>
          <p className="text-sm font-semibold">
            {t("Your employer pays {v}", { v: formatCzk(r.employerCost) })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Gross plus {social} social and {health} health insurance.", {
              social: formatCzk(r.employerSocial),
              health: formatCzk(r.employerHealth),
            })}
          </p>
        </Panel>

        <p className="text-xs text-muted-foreground">
          {t("Valid for {year} · an educational estimate, not payroll advice.", {
            year: CZ_2026.year,
          })}
        </p>
      </div>
    </div>
  );
}
