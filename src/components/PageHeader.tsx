import type { ComponentType, ReactNode } from "react";
import { TONE, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** Calculator page title with its illustration tile and the actions on the right. */
export function PageHeader({
  title,
  subtitle,
  Visual,
  tone = "green",
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  Visual?: ComponentType;
  tone?: Tone;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-4">
        {Visual && (
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl px-2 py-3",
              TONE[tone].tile,
            )}
            aria-hidden="true"
          >
            <Visual />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}
