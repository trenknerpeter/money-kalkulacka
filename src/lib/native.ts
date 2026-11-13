import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** True only inside the iOS/Android shell built with `npm run build:ios`; false on the web. */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Native-only glue for the Capacitor shell: keeps the status bar text readable
 * against the current theme and hides the launch screen once React is up.
 * A no-op on the web.
 */
export function useNativeShell() {
  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    let observer: MutationObserver | undefined;

    void (async () => {
      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      if (cancelled) return;

      const sync = () => {
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        // Style.Dark = light text (for dark backgrounds), Style.Light = dark text.
        void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      };
      sync();
      observer = new MutationObserver(sync);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });

      void SplashScreen.hide().catch(() => {});
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);
}
