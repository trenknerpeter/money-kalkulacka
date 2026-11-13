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

/** Which milestone gives a shared dot its colour. */
const PRIORITY: Record<MarkerKind, number> = {
  today: 4,
  independent: 3,
  retirement: 2,
  "debt-free": 1,
};

export type MarkerGroup = {
  /** Position on the axis. */
  age: number;
  /** All milestones that land here, most meaningful first. */
  kinds: MarkerKind[];
  /** Label row: 0 on the line, 1 just below it, so close neighbours do not overprint. */
  row: 0 | 1;
};

/**
 * Lays every milestone out. Ones at (almost) the same age share a dot and a label;
 * ones close together keep their own dot and alternate between two label rows.
 */
export function layoutMarkers(
  markers: LifeMarker[],
  from: number,
  to: number,
  closeShare = 0.16,
  sameShare = 0.015,
): MarkerGroup[] {
  const span = Math.max(1, to - from);
  const out: MarkerGroup[] = [];
  for (const m of [...markers].sort((a, b) => a.age - b.age)) {
    const prev = out[out.length - 1];
    const gap = prev ? (m.age - prev.age) / span : Infinity;
    if (prev && gap < sameShare) {
      prev.kinds = [...prev.kinds, m.kind].sort((a, b) => PRIORITY[b] - PRIORITY[a]);
    } else if (prev && gap < closeShare) {
      out.push({ age: m.age, kinds: [m.kind], row: prev.row === 0 ? 1 : 0 });
    } else {
      out.push({ age: m.age, kinds: [m.kind], row: 0 });
    }
  }
  return out;
}
