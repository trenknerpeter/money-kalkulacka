/** Milestones on the life timeline, in the order they usually happen. */
export type MarkerKind = "today" | "debt-free" | "independent" | "retirement";

export type LifeMarker = { kind: MarkerKind; age: number };

/** Builds the markers that exist; fewer than two is not a timeline, so returns []. */
export function lifeMarkers(input: {
  age: number | null;
  debtFreeAge: number | null;
  livingAge: number | null;
  pensionAge: number | null;
}): LifeMarker[] {
  const out: LifeMarker[] = [];
  if (input.age !== null) out.push({ kind: "today", age: input.age });
  if (input.debtFreeAge !== null) out.push({ kind: "debt-free", age: input.debtFreeAge });
  if (input.livingAge !== null) out.push({ kind: "independent", age: input.livingAge });
  if (input.pensionAge !== null) out.push({ kind: "retirement", age: input.pensionAge });
  return out.length >= 2 ? out : [];
}

/** Which milestone wins when two land too close together. */
const PRIORITY: Record<MarkerKind, number> = {
  today: 4,
  independent: 3,
  retirement: 2,
  "debt-free": 1,
};

/**
 * Drops markers that would sit on top of each other (closer than `minShare` of the span).
 * Of two that collide, the more meaningful one stays (see PRIORITY).
 */
export function spreadMarkers(markers: LifeMarker[], from: number, to: number, minShare = 0.16) {
  const span = Math.max(1, to - from);
  const out: LifeMarker[] = [];
  for (const m of [...markers].sort((a, b) => a.age - b.age)) {
    const prev = out[out.length - 1];
    if (prev && (m.age - prev.age) / span < minShare) {
      if (PRIORITY[m.kind] > PRIORITY[prev.kind]) out[out.length - 1] = m;
      continue;
    }
    out.push(m);
  }
  return out;
}
