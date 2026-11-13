import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string | undefined;
  suffixPosition?: "left" | "right" | undefined;
  disabled?: boolean | undefined;
};

export function NumberSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  suffixPosition = "right",
  disabled = false,
}: Props) {
  const [text, setText] = useState(String(value));
  // While the user types, keep their text even if the parent clamps the value
  // (e.g. "6" on the way to "67" must not snap to a minimum); blur shows the real value.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) return;
    setText((prev) => (parseFloat(prev) === value ? prev : String(value)));
  }, [value, editing]);

  const commit = (raw: string) => {
    setText(raw);
    const n = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(",", "."));
    onChange(!isFinite(n) || isNaN(n) ? 0 : Math.max(0, n));
  };

  const sliderValue = Math.min(Math.max(value, min), max);

  return (
    <div
      className={disabled ? "space-y-3 opacity-50" : "space-y-3"}
      aria-disabled={disabled || undefined}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm text-muted-foreground">{label}</label>
        <div className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 focus-within:border-primary">
          {suffix && suffixPosition === "left" && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
          <input
            inputMode="decimal"
            value={text}
            onChange={(e) => commit(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              setText(String(value));
            }}
            className="tnum w-24 bg-transparent text-right text-sm font-medium tabular-nums outline-none"
            aria-label={label}
            disabled={disabled}
          />
          {suffix && suffixPosition === "right" && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
        </div>
      </div>
      <Slider
        value={[sliderValue]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        aria-label={`${label} slider`}
      />
    </div>
  );
}
