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

/** Four tiles waiting to be filled: the dashboard before any numbers exist. */
export function EmptyDashboardVisual() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="190"
        height="110"
        rx="16"
        className="fill-none stroke-border"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      {/* salary / invest: rising bars */}
      <rect x="18" y="18" width="78" height="40" rx="10" className="fill-accent" opacity="0.22" />
      <rect x="30" y="38" width="9" height="12" rx="2" className="fill-accent" opacity="0.6" />
      <rect x="44" y="32" width="9" height="18" rx="2" className="fill-accent" opacity="0.8" />
      <rect x="58" y="26" width="9" height="24" rx="2" className="fill-accent" />
      {/* retirement: a clock */}
      <rect x="104" y="18" width="78" height="40" rx="10" className="fill-warning" opacity="0.22" />
      <circle cx="143" cy="38" r="12" className="fill-none stroke-warning" strokeWidth="3" />
      <path d="M143 31 V38 L148 41" className="fill-none stroke-warning" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* mortgage: a roof */}
      <rect x="18" y="66" width="78" height="38" rx="10" className="fill-info" opacity="0.22" />
      <path d="M44 88 L57 76 L70 88 M48 86 V94 H66 V86" className="fill-none stroke-info" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* the plan: a target that is still empty */}
      <rect x="104" y="66" width="78" height="38" rx="10" className="fill-none stroke-border" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M143 78 V92 M136 85 H150" className="fill-none stroke-muted-foreground" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** The dashboard once it is filled in: four tiles, one per topic. */
export function DashboardVisual() {
  return (
    <svg viewBox="0 0 160 96" className="h-full w-full" aria-hidden="true">
      <rect x="10" y="10" width="64" height="34" rx="8" className="fill-accent" opacity="0.28" />
      <rect x="22" y="30" width="7" height="8" rx="2" className="fill-accent" opacity="0.6" />
      <rect x="33" y="24" width="7" height="14" rx="2" className="fill-accent" opacity="0.8" />
      <rect x="44" y="18" width="7" height="20" rx="2" className="fill-accent" />
      <rect x="86" y="10" width="64" height="34" rx="8" className="fill-warning" opacity="0.28" />
      <circle cx="118" cy="27" r="10" className="fill-none stroke-warning" strokeWidth="3" />
      <path d="M118 21 V27 L122 30" className="fill-none stroke-warning" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="52" width="64" height="34" rx="8" className="fill-info" opacity="0.28" />
      <path d="M32 72 L42 63 L52 72 M35 70 V78 H49 V70" className="fill-none stroke-info" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="86" y="52" width="64" height="34" rx="8" className="fill-foreground" opacity="0.14" />
      <path d="M98 76 C108 76 112 66 122 66 S136 60 140 58" className="fill-none stroke-foreground" strokeWidth="3" strokeLinecap="round" />
      <circle cx="140" cy="58" r="3.5" className="fill-foreground" />
    </svg>
  );
}
