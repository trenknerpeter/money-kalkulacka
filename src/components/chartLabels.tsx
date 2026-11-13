type ViewBox = { viewBox?: { x?: number; y?: number; width?: number; height?: number } };

/**
 * A text label pinned to a ReferenceDot, for naming a series where it ends instead of in a
 * legend. `dx`/`dy` move it from the dot's centre; a card-coloured halo keeps it readable
 * over fills and lines.
 */
export function pointLabel(
  text: string,
  opts: {
    fill: string;
    dx?: number;
    dy?: number;
    anchor?: "start" | "middle" | "end";
    size?: number;
    weight?: number;
  },
) {
  return function PointLabel(props: ViewBox) {
    const { x = 0, y = 0, width = 0, height = 0 } = props.viewBox ?? {};
    return (
      <text
        x={x + width / 2 + (opts.dx ?? 0)}
        y={y + height / 2 + (opts.dy ?? -10)}
        textAnchor={opts.anchor ?? "end"}
        fill={opts.fill}
        fontSize={opts.size ?? 12}
        fontWeight={opts.weight ?? 600}
        stroke="var(--card)"
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {text}
      </text>
    );
  };
}
