import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFormatters } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Small "In today's money ⓘ" tag. Tapping it explains what the figure means.
 * Used next to every future amount so all tabs read the same way.
 */
export function TodaysMoney({
  inflation,
  onInk = false,
  className,
}: {
  inflation?: number;
  onInk?: boolean;
  className?: string;
}) {
  const { t } = useT();
  const { percent } = useFormatters();
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
          onInk
            ? "bg-white/10 text-ink-muted hover:text-white"
            : "bg-muted text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        {t("In today's money")}
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="space-y-2 text-sm leading-relaxed">
        <p>
          {inflation !== undefined
            ? t(
                "Prices rise over time (here by {p} a year), so the same amount buys less later than it does today.",
                {
                  p: percent(inflation),
                },
              )
            : t(
                "Prices rise over time, so the same amount buys less later than it does today.",
              )}{" "}
          {t(
            "We convert future amounts to what they would buy now, so you can compare them with today.",
          )}
        </p>
        <p className="text-muted-foreground">
          {t("Your monthly deposits stay the same amount. They don't rise with inflation.")}
        </p>
      </PopoverContent>
    </Popover>
  );
}
