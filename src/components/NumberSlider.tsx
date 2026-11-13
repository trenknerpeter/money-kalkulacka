import { useEffect, useId, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
  const id = useId();
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
      className={cn("space-y-2", disabled && "opacity-50")}
      aria-disabled={disabled || undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-3 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          {suffix && suffixPosition === "left" && (
            <span className="text-sm text-muted-foreground">{suffix}</span>
          )}
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(e) => commit(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              setText(String(value));
            }}
            className="tnum w-24 bg-transparent text-right text-base font-semibold tabular-nums outline-none"
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
