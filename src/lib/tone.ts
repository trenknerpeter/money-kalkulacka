/** Topic colours: green for money growing, amber for pension, blue for debt. */
export type Tone = "green" | "amber" | "blue";

export const TONE = {
  green: {
    /** Soft tile background; also re-points --primary so illustrations recolour inside it. */
    tile: "bg-accent-soft",
    pill: "bg-accent-soft text-primary-deep",
    dot: "bg-accent",
    badge: "bg-card text-primary-deep",
    text: "text-primary-deep",
  },
  amber: {
    tile: "bg-warning-soft [--primary:var(--warning)]",
    pill: "bg-warning-soft text-warning-deep",
    dot: "bg-warning",
    badge: "bg-card text-warning-deep",
    text: "text-warning-deep",
  },
  blue: {
    tile: "bg-info-soft [--primary:var(--info)]",
    pill: "bg-info-soft text-info-deep",
    dot: "bg-info",
    badge: "bg-card text-info-deep",
    text: "text-info-deep",
  },
} as const satisfies Record<Tone, Record<string, string>>;
