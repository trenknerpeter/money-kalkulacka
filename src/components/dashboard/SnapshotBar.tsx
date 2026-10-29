import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormatters } from "@/lib/currency";
import { snapshotMetrics } from "@/lib/dashboard";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  MAX_SNAPSHOTS,
  applyData,
  captureData,
  decodeSnapshot,
  deleteSnapshot,
  encodeSnapshot,
  getActiveId,
  listSnapshots,
  parseSnapshot,
  renameSnapshot,
  saveSnapshot,
  setActiveId,
  type Snapshot,
} from "@/lib/snapshots";

function reloadDashboard() {
  window.location.assign("/dashboard");
}

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted";

/**
 * The Dashboard header: title, the active scenario, and an Options menu holding
 * the saved scenarios, sharing, saving to a file and Save as PDF.
 */
export function SnapshotBar({ canPrint }: { canPrint: boolean }) {
  const { t } = useT();
  const { money } = useFormatters();
  const [list, setList] = useState<Snapshot[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [naming, setNaming] = useState<null | { mode: "new" | "rename"; value: string }>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const l = listSnapshots();
    const id = getActiveId();
    const active = l.find((s) => s.id === id) ?? null;
    setList(l);
    setActive(active ? active.id : null);
    setDirty(active ? JSON.stringify(captureData()) !== JSON.stringify(active.data) : false);
  };

  useEffect(() => {
    refresh();
    const code = new URLSearchParams(window.location.search).get("s");
    if (code) setShared(decodeSnapshot(code));
  }, []);

  const active = list.find((s) => s.id === activeId) ?? null;
  const full = list.length >= MAX_SNAPSHOTS;

  const switchTo = (s: Snapshot) => {
    if (s.id === activeId && !dirty) return;
    if ((dirty || !active) && !window.confirm(t("Switching replaces the numbers in every tab with this snapshot. Unsaved changes will be lost. Continue?"))) return;
    applyData(s.data);
    setActiveId(s.id);
    reloadDashboard();
  };

  const submitName = () => {
    if (!naming) return;
    if (naming.mode === "new" && !full) saveSnapshot(naming.value);
    else if (active) renameSnapshot(active.id, naming.value);
    setNaming(null);
    refresh();
  };

  const copyLink = async () => {
    const code = encodeSnapshot({ name: active?.name ?? t("Financial snapshot"), data: captureData() });
    const url = `${window.location.origin}/dashboard?s=${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(t("Copy share link"), url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    const snap = { name: active?.name ?? t("Financial snapshot"), savedAt: new Date().toISOString(), data: captureData() };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `money-kalkulacka-${snap.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    setError(null);
    try {
      const snap = parseSnapshot(JSON.parse(await file.text()));
      if (!snap) throw new Error();
      setShared(snap);
    } catch {
      setError(t("That file isn't from Money Kalkulačka."));
    }
  };

  const loadShared = () => {
    if (!shared) return;
    applyData(shared.data);
    // With every slot taken it loads as the unsaved current situation.
    if (full) setActiveId(null);
    else saveSnapshot(shared.name, shared.data);
    reloadDashboard();
  };

  const item = "gap-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{t("Dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Based on what you've saved in the other tabs. Everything stays in your browser.")}
          </p>
          {active && (
            <p className="mt-1 text-xs text-muted-foreground print:hidden">
              {t("Scenario: {name}", { name: active.name })}
              {dirty && <> · {t("Edited since saved")}</>}
            </p>
          )}
          {error && <p className="mt-1 text-xs text-negative">{error}</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(btn, "print:hidden")}>
              {copied ? t("Link copied") : t("Options")}
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Scenarios")} · {list.length}/{MAX_SNAPSHOTS}
            </DropdownMenuLabel>
            {list.length === 0 && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                {t("Save your whole situation — every tab at once — and come back to it, compare, or share it.")}
              </p>
            )}
            {list.map((s) => {
              const m = snapshotMetrics(s.data);
              return (
                <DropdownMenuItem key={s.id} onSelect={() => switchTo(s)} className="items-start gap-2">
                  <Check
                    className={cn("mt-0.5 size-4 shrink-0 text-primary", s.id !== activeId && "invisible")}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="tnum block text-xs text-muted-foreground">
                      {m.livingAge !== null
                        ? t("{v} · stop work at {age}", { v: money(m.netWorth), age: m.livingAge })
                        : money(m.netWorth)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
            {active && dirty && (
              <DropdownMenuItem
                className={item}
                onSelect={() => {
                  saveSnapshot(active.name, captureData(), active.id);
                  refresh();
                }}
              >
                <RefreshCw className="size-4" />
                {t("Update “{name}”", { name: active.name })}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className={item}
              disabled={full}
              onSelect={() => setNaming({ mode: "new", value: "" })}
            >
              <Plus className="size-4" />
              {full ? t("All {max} slots used", { max: MAX_SNAPSHOTS }) : t("Save as new scenario…")}
            </DropdownMenuItem>
            {active && (
              <>
                <DropdownMenuItem
                  className={item}
                  onSelect={() => setNaming({ mode: "rename", value: active.name })}
                >
                  <Pencil className="size-4" />
                  {t("Rename “{name}”", { name: active.name })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={item}
                  onSelect={() => {
                    if (window.confirm(t("Delete “{name}”?", { name: active.name }))) {
                      deleteSnapshot(active.id);
                      refresh();
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  {t("Delete “{name}”", { name: active.name })}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            {canPrint && (
              <DropdownMenuItem className={item} onSelect={() => window.print()}>
                <FileText className="size-4" />
                {t("Save as PDF")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className={item} onSelect={() => void copyLink()}>
              <Link2 className="size-4" />
              {t("Copy share link")}
            </DropdownMenuItem>
            <DropdownMenuItem className={item} onSelect={download}>
              <Download className="size-4" />
              {t("Save to file")}
            </DropdownMenuItem>
            <DropdownMenuItem className={item} onSelect={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {t("Load from file")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {shared && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm print:hidden">
          <p className="font-semibold">
            {t("Someone shared a financial snapshot with you: {name}", { name: shared.name })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {t("Loading it replaces the numbers in every tab. Save your own first if you want to keep them.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={loadShared} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              {t("Load and save")}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setShared(null);
                window.history.replaceState(null, "", "/dashboard");
              }}
            >
              {t("Dismiss")}
            </button>
          </div>
        </div>
      )}

      <Dialog open={naming !== null} onOpenChange={(o) => !o && setNaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {naming?.mode === "rename" ? t("Rename scenario") : t("Save as new scenario")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitName();
            }}
          >
            <input
              autoFocus
              aria-label={t("Snapshot name")}
              value={naming?.value ?? ""}
              placeholder={t("e.g. Baseline Oct 2026")}
              onChange={(e) => naming && setNaming({ ...naming, value: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <DialogFooter className="mt-4 gap-2">
              <button type="button" className={btn} onClick={() => setNaming(null)}>
                {t("Cancel")}
              </button>
              <button
                type="submit"
                disabled={!naming?.value.trim()}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {t("Save")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
