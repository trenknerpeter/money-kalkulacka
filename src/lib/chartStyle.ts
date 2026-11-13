/** Shared look for every chart: one tooltip box, one crosshair, one gradient recipe. */

export const TOOLTIP_BOX = "rounded-xl border border-border bg-card p-3 text-xs shadow-card";

/** Dashed vertical crosshair that follows the pointer. */
export const CROSSHAIR = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 1,
  strokeDasharray: "3 4",
} as const;

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

/** Gradient ids must be valid in `url(#…)`; React's useId contains colons. */
export const gradientId = (base: string, uid: string) =>
  `${base}-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;
