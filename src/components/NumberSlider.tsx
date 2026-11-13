import { useEffect, useId, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type Preset = { value: number; label?: string };

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
  /** Quick picks shown under the slider; the one equal to the current value is highlighted. */
  presets?: Preset[] | undefined;
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
  presets,
}: Props) {
  const id = useId();
  const { locale } = useT();
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
  const chipLabel = (p: Preset) =>
    p.label ??
    `${p.value.toLocaleString(locale)}${suffix && suffixPosition === "right" ? `\u00a0${suffix}` : ""}`;

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
        onValueChange={(v) => {
          const next = v[0] ?? 0;
          if (next !== sliderValue) haptic.tick();
          onChange(next);
        }}
        aria-label={`${label} slider`}
      />
      {presets && presets.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 pt-0.5"
          role="group"
          aria-label={`${label}: quick picks`}
        >
          {presets.map((p) => {
            const active = Math.abs(value - p.value) < step / 2;
            return (
              <button
                key={p.value}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onChange(p.value)}
                className={cn(
                  "tnum h-8 rounded-full border px-3 text-[13px] transition-colors disabled:pointer-events-none",
                  active
                    ? "border-primary bg-accent-soft font-semibold text-primary-deep"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {chipLabel(p)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
