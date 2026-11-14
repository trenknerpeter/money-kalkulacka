import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Advanced settings" disclosure for input panels: keeps the less-used fields out of
 * the way. Pass `active` when any field inside differs from its default, so a saved
 * or shared scenario never hides a setting that changes the result.
 */
export function AdvancedSettings({
  active = false,
  children,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(active);
  // Scenarios load from storage/URL after the first render, so open once they do.
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("border-t border-border pt-4", className)}
    >
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-4 text-sm font-semibold tracking-tight">
        {t("Advanced settings")}
        <ChevronDown strokeWidth={2.5} className="size-5 text-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-6 pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
