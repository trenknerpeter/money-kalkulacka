import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const { t } = useT();

  const copy = async () => {
    track("calculator_link_copied", { calculator: window.location.pathname });
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
      {copied ? t("Copied") : t("Copy link")}
    </button>
  );
}
