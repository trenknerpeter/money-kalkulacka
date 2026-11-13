import { useCallback, useEffect, useState } from "react";
import { track } from "./analytics";

/** Light for everyone by default; dark only when someone picks it in the settings menu. */
export type Theme = "light" | "dark";

export const THEME_KEY = "finbuddy.theme";

/**
 * Runs in <head> before the first paint, so a saved dark choice never flashes light.
 * Kept tiny and dependency-free on purpose.
 */
export const THEME_BOOT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}`;

function apply(theme: Theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(
      document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
    );
  }, []);

  const setTheme = useCallback((next: Theme) => {
    apply(next);
    try {
      if (next === "dark") window.localStorage.setItem(THEME_KEY, "dark");
      else window.localStorage.removeItem(THEME_KEY);
    } catch {
      /* ignore */
    }
    setThemeState((prev) => {
      if (prev !== next) track("theme_changed", { from: prev, to: next });
      return next;
    });
  }, []);

  return { theme, setTheme };
}
