/** Small decorative visuals for the homepage cards. Colours come from theme tokens. */

export function InvestVisual() {
  const bars = [18, 26, 34, 46, 60, 78];
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      {bars.map((h, i) => (
        <g key={i}>
          <rect
            x={14 + i * 23}
            y={86 - h}
            width="15"
            height={h}
            rx="3"
            className="fill-primary"
            opacity={0.25 + i * 0.13}
          />
        </g>
      ))}
      <path
        d="M14 66 C 50 62, 90 44, 146 10"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-foreground"
      />
      <circle cx="146" cy="10" r="4" className="fill-foreground" />
    </svg>
  );
}

export function MortgageVisual() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      {/* declining balance */}
      <path
        d="M10 18 C 60 22, 110 48, 150 86 L 150 88 L 10 88 Z"
        className="fill-primary"
        opacity="0.18"
      />
      <path
        d="M10 18 C 60 22, 110 48, 150 86"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-primary"
      />
      {/* house */}
      <g transform="translate(52 22)">
        <path
          d="M0 26 L28 4 L56 26"
          fill="none"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-foreground"
        />
        <rect
          x="8"
          y="24"
          width="40"
          height="34"
          rx="2"
          className="fill-card stroke-foreground"
          strokeWidth="3"
        />
        <rect x="23" y="40" width="10" height="18" rx="1" className="fill-primary" />
      </g>
    </svg>
  );
}

export function PlanVisual() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      {/* path to a target */}
      <path
        d="M12 82 C 40 82, 46 50, 74 50 S 108 22, 128 22"
        fill="none"
        strokeWidth="2.5"
        strokeDasharray="5 6"
        strokeLinecap="round"
        className="stroke-muted-foreground"
      />
      <circle cx="12" cy="82" r="5" className="fill-primary" opacity="0.5" />
      <circle cx="74" cy="50" r="5" className="fill-primary" opacity="0.75" />
      <circle cx="132" cy="22" r="16" className="fill-primary" opacity="0.18" />
      <circle cx="132" cy="22" r="10" className="fill-primary" opacity="0.4" />
      <circle cx="132" cy="22" r="4.5" className="fill-primary" />
    </svg>
  );
}

export function SalaryVisual() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      {/* gross bar, then net bar after deductions */}
      <rect x="22" y="14" width="34" height="72" rx="3" className="fill-primary" opacity="0.25" />
      <rect
        x="22"
        y="14"
        width="34"
        height="18"
        rx="3"
        className="fill-foreground"
        opacity="0.55"
      />
      <path
        d="M64 50 L 92 50"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-muted-foreground"
      />
      <path
        d="M86 44 L 94 50 L 86 56"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-muted-foreground"
      />
      <rect x="104" y="32" width="34" height="54" rx="3" className="fill-primary" />
    </svg>
  );
}

export function RetirementVisual() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      {/* stepped monthly income: state pension, then DPS and DIP on top */}
      <rect x="22" y="56" width="30" height="30" rx="3" className="fill-primary" />
      <rect x="62" y="40" width="30" height="46" rx="3" className="fill-primary" opacity="0.65" />
      <rect x="102" y="22" width="30" height="64" rx="3" className="fill-primary" opacity="0.35" />
      <path
        d="M22 86 L 132 86"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-muted-foreground"
      />
    </svg>
  );
}
