import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { flushUrlSync } from "@/lib/urlSync";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  const { t } = useT();

  const copy = async () => {
    track("calculator_link_copied", { calculator: window.location.pathname });
    const url = flushUrlSync();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
      {copied ? t("Copied") : t("Copy link")}
    </button>
  );
}
