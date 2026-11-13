import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "card" | "input" | "hero";

/*
 * Three surface levels:
 *  - input: muted, borderless; the sliders and switches live here.
 *  - card:  white with a soft shadow; results, charts, tables.
 *  - hero:  ink with light text; one per page, for the headline number.
 */
const VARIANT: Record<Variant, string> = {
  card: "rounded-xl border border-border bg-card p-6 shadow-card",
  input: "rounded-xl bg-muted p-5 sm:p-6",
  hero: "rounded-2xl bg-ink p-6 text-ink-foreground shadow-hero sm:p-8 print:border print:border-border print:shadow-none",
};

export function Panel({
  children,
  className,
  title,
  variant = "card",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: Variant;
}) {
  return (
    <section className={cn(VARIANT[variant], className)}>
      {title && <h2 className="mb-5 font-display text-lg font-semibold tracking-tight">{title}</h2>}
      {children}
    </section>
  );
}

/** Small uppercase label above a headline number. */
export function Eyebrow({
  children,
  className,
  onInk = false,
}: {
  children: ReactNode;
  className?: string;
  onInk?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.1em]",
        onInk ? "text-ink-accent" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A compact result tile: label, number, optional caption or pill. */
export function StatTile({
  label,
  value,
  caption,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  caption?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("min-w-0 rounded-xl border border-border bg-card p-5 shadow-card", className)}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tnum mt-1.5 whitespace-nowrap text-[clamp(1.25rem,2vw,1.625rem)] font-semibold tracking-tight",
          accent ? "text-primary-deep" : "text-foreground",
        )}
      >
        {value}
      </p>
      {caption && <div className="mt-1.5 text-sm text-muted-foreground">{caption}</div>}
    </div>
  );
}

/** A one-sentence takeaway under a chart or result. */
export function Insight({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl bg-accent-soft p-4 sm:p-5">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary-deep" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {children && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
        )}
      </div>
    </div>
  );
}
