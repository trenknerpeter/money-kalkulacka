import { useT } from "@/lib/i18n";
import { layoutMarkers, type LifeMarker, type MarkerKind } from "@/lib/lifeline";
import { cn } from "@/lib/utils";

const STYLE: Record<MarkerKind, { dot: string; label: string }> = {
  today: { dot: "bg-ink-foreground border-2 border-accent", label: "today" },
  "debt-free": { dot: "bg-info", label: "debt-free" },
  independent: { dot: "bg-accent", label: "independent" },
  retirement: { dot: "bg-warning", label: "retirement" },
};

/** Horizontal timeline of money milestones, drawn for an ink surface. */
export function LifeTimeline({
  markers,
  className,
}: {
  markers: LifeMarker[];
  className?: string;
}) {
  const { t } = useT();
  if (markers.length < 2) return null;

  const ages = markers.map((m) => m.age);
  const lo = Math.min(...ages);
  const hi = Math.max(...ages);
  const pad = Math.max(2, (hi - lo) * 0.08);
  const from = lo - pad;
  const to = hi + pad;
  const groups = layoutMarkers(markers, from, to);
  const at = (age: number) => ((age - from) / (to - from)) * 100;
  const today = markers.find((m) => m.kind === "today");
  const twoRows = groups.some((g) => g.row === 1);
  const summary = [...markers]
    .sort((a, b) => a.age - b.age)
    .map((m) => `${t(STYLE[m.kind].label)} ${m.age}`)
    .join(", ");

  return (
    <div
      className={className}
      role="img"
      aria-label={`${t("Timeline of your money milestones")}: ${summary}`}
    >
      <div className="relative h-1.5 rounded-full bg-ink-foreground/15">
        {today && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${at(today.age)}%` }}
          />
        )}
        {groups.map((g) => (
          <span
            key={`${g.age}-${g.kinds[0]}`}
            className={cn(
              "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              STYLE[g.kinds[0]!].dot,
            )}
            style={{ left: `${at(g.age)}%` }}
          />
        ))}
      </div>
      <div
        className={cn("relative mt-3 text-[11px] text-ink-muted", twoRows ? "h-[4.5rem]" : "h-11")}
      >
        {groups.map((g) => (
          <span
            key={`${g.age}-${g.kinds[0]}`}
            className="absolute -translate-x-1/2 text-center leading-tight"
            style={{
              left: `${Math.min(90, Math.max(10, at(g.age)))}%`,
              top: g.row === 1 ? "2.25rem" : 0,
            }}
          >
            <strong className="tnum block text-[13px] text-ink-foreground">{g.age}</strong>
            {g.kinds.map((k) => t(STYLE[k].label)).join(" · ")}
          </span>
        ))}
      </div>
    </div>
  );
}
