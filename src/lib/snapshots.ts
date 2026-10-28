/**
 * Master snapshots: one named bundle of every tab's saved state
 * (Mzda, Invest, Mortgage, Plan, Dashboard income, currency). Stored locally.
 */
export const SNAPSHOT_KEYS = [
  "finbuddy.invest",
  "finbuddy.mortgage",
  "finbuddy.profile.v1",
  "finbuddy.dashboard.v1",
  "finbuddy.currency",
  "finbuddy.salary",
] as const;

/** How many scenarios can be kept side by side. */
export const MAX_SNAPSHOTS = 3;

const LIST_KEY = "finbuddy.snapshots.v1";
const ACTIVE_KEY = "finbuddy.snapshots.active";

export type Snapshot = {
  id: string;
  name: string;
  savedAt: string;
  data: Record<string, string>;
};

export function captureData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const k of SNAPSHOT_KEYS) {
    const v = window.localStorage.getItem(k);
    if (v !== null) data[k] = v;
  }
  return data;
}

export function hasAnyData(): boolean {
  return SNAPSHOT_KEYS.some(
    (k) => k !== "finbuddy.currency" && window.localStorage.getItem(k) !== null,
  );
}

export function applyData(data: Record<string, string>) {
  for (const k of SNAPSHOT_KEYS) {
    const v = data[k];
    if (typeof v === "string") window.localStorage.setItem(k, v);
    else if (k !== "finbuddy.currency") window.localStorage.removeItem(k);
  }
}

export function listSnapshots(): Snapshot[] {
  try {
    const raw = window.localStorage.getItem(LIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed.filter(isSnapshot) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function writeList(list: Snapshot[]) {
  window.localStorage.setItem(LIST_KEY, JSON.stringify(list));
}

export function getActiveId(): string | null {
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function setActiveId(id: string | null) {
  if (id) window.localStorage.setItem(ACTIVE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function saveSnapshot(name: string, data = captureData(), id?: string): Snapshot {
  const list = listSnapshots();
  const snap: Snapshot = {
    id: id ?? newId(),
    name: name.trim() || "Snapshot",
    savedAt: new Date().toISOString(),
    data,
  };
  const idx = list.findIndex((s) => s.id === snap.id);
  if (idx >= 0) list[idx] = snap;
  else list.push(snap);
  writeList(list);
  setActiveId(snap.id);
  return snap;
}

export function renameSnapshot(id: string, name: string) {
  writeList(listSnapshots().map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s)));
}

export function deleteSnapshot(id: string) {
  writeList(listSnapshots().filter((s) => s.id !== id));
  if (getActiveId() === id) setActiveId(null);
}

function isSnapshot(v: unknown): v is Snapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o["name"] === "string" && typeof o["data"] === "object" && o["data"] !== null;
}

/** Parses an exported file or a decoded link payload. */
export function parseSnapshot(raw: unknown): Snapshot | null {
  if (!isSnapshot(raw)) return null;
  const data: Record<string, string> = {};
  for (const k of SNAPSHOT_KEYS) {
    const v = (raw.data as Record<string, unknown>)[k];
    if (typeof v === "string") data[k] = v;
  }
  return {
    id: typeof raw.id === "string" ? raw.id : newId(),
    name: raw.name,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
    data,
  };
}

export function encodeSnapshot(s: { name: string; data: Record<string, string> }): string {
  const json = JSON.stringify({ name: s.name, data: s.data });
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSnapshot(code: string): Snapshot | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return parseSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
