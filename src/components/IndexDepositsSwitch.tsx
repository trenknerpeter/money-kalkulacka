import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Raise deposits with inflation" switch. Off by default: monthly deposits stay the
 * same amount. Shared by the Invest tab and the independence plan so both read alike.
 */
export function IndexDepositsSwitch({
  id,
  checked,
  onChange,
  className,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const { t } = useT();
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {t("Raise deposits with inflation")}
        </label>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {checked
          ? t(
              "Each month's deposit grows with inflation, so it keeps the same value in today's money.",
            )
          : t("Off: you deposit the same amount every month, as most people do.")}
      </p>
    </div>
  );
}
