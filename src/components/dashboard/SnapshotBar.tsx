import { useEffect, useRef, useState } from "react";
import { Check, Download, Link2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Panel } from "@/components/Panel";
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

export function SnapshotBar() {
  const { t, locale } = useT();
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
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

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
      setError(t("That file isn't a Money Kalkulačka backup."));
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

  return (
    <div className="space-y-3">
      {shared && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
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

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("Scenarios")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.length === 0
                ? t("Save your whole situation — every tab at once — and come back to it, compare, or share it.")
                : t("{n} of {max} saved. Pick one to load it into every tab.", {
                    n: list.length,
                    max: MAX_SNAPSHOTS,
                  })}
            </p>
          </div>
          <button type="button" className={btn} onClick={copyLink}>
            <Link2 className="size-4" />
            {copied ? t("Link copied") : t("Copy share link")}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {list.map((s) => {
            const isActive = s.id === activeId;
            const m = snapshotMetrics(s.data);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => switchTo(s)}
                aria-pressed={isActive}
                className={cn(
                  "min-w-0 rounded-lg border p-4 text-left transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {isActive && <Check className="size-4 shrink-0 text-primary" />}
                  <span className="truncate text-sm font-semibold">{s.name}</span>
                </span>
                <span className="tnum mt-2 block text-lg font-semibold tracking-tight">
                  {money(m.netWorth)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {m.livingAge !== null
                    ? t("Net worth · stop work at {age}", { age: m.livingAge })
                    : t("Net worth")}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {isActive && dirty ? t("Edited since saved") : fmtDate(s.savedAt)}
                </span>
              </button>
            );
          })}
          {!full && (
            <button
              type="button"
              onClick={() => setNaming({ mode: "new", value: "" })}
              className="flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-5" />
              {list.length === 0 ? t("Save current as a scenario") : t("Save current as new")}
            </button>
          )}
        </div>

        {active && dirty && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {t("You've changed numbers since saving “{name}”.", { name: active.name })}
            </span>
            <button
              type="button"
              className={btn}
              onClick={() => {
                saveSnapshot(active.name, captureData(), active.id);
                refresh();
              }}
            >
              {t("Update “{name}”", { name: active.name })}
            </button>
          </div>
        )}
        {full && (dirty || !active) && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("All {max} slots are used. Update one, or delete one to save another.", {
              max: MAX_SNAPSHOTS,
            })}
          </p>
        )}

        {naming && (
          <form
            className="mt-4 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitName();
            }}
          >
            <input
              autoFocus
              aria-label={t("Snapshot name")}
              value={naming.value}
              placeholder={t("e.g. Baseline Oct 2026")}
              onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button type="submit" disabled={!naming.value.trim()} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {t("Save")}
            </button>
            <button type="button" className={btn} onClick={() => setNaming(null)}>
              {t("Cancel")}
            </button>
          </form>
        )}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
          {active && (
            <>
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setNaming({ mode: "rename", value: active.name })}>
                <Pencil className="size-3.5" />
                {t("Rename")}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-negative"
                onClick={() => {
                  if (window.confirm(t("Delete “{name}”?", { name: active.name }))) {
                    deleteSnapshot(active.id);
                    refresh();
                  }
                }}
              >
                <Trash2 className="size-3.5" />
                {t("Delete")}
              </button>
            </>
          )}
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={download}>
            <Download className="size-3.5" />
            {t("Download backup")}
          </button>
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3.5" />
            {t("Import backup")}
          </button>
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
          {error && <span className="text-negative">{error}</span>}
        </div>
      </Panel>
    </div>
  );
}
