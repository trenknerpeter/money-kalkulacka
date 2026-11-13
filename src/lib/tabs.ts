import { PENSION_KEY } from "./pension";
import { PLAN_KEY } from "./plan";
import { SALARY_KEY } from "./salary";
import type { Tone } from "./tone";

/** The five calculator tabs and the storage key that means "this tab holds numbers". */
export const DATA_TABS: {
  to: "/mzda" | "/duchod" | "/invest" | "/mortgage" | "/plan";
  label: string;
  key: string;
  tone: Tone;
}[] = [
  { to: "/mzda", label: "Salary", key: SALARY_KEY, tone: "green" },
  { to: "/duchod", label: "Retirement", key: PENSION_KEY, tone: "amber" },
  { to: "/invest", label: "Invest", key: "finbuddy.invest", tone: "green" },
  { to: "/mortgage", label: "Mortgage", key: "finbuddy.mortgage", tone: "blue" },
  { to: "/plan", label: "Financial independence", key: PLAN_KEY, tone: "green" },
];

/** Which tabs hold numbers right now. Client only. */
export function readFilledTabs(): Set<string> {
  const out = new Set<string>();
  try {
    for (const tab of DATA_TABS) if (window.localStorage.getItem(tab.key) !== null) out.add(tab.to);
  } catch {
    /* ignore */
  }
  return out;
}
