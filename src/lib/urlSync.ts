import type { useRouter } from "@tanstack/react-router";

type Router = ReturnType<typeof useRouter>;

/**
 * Safari throws a SecurityError once a page calls history.replaceState more than 100 times
 * in 10 seconds, and that error leaves the router unable to navigate (tabs stop switching).
 * Typing or dragging a slider changes the scenario on every event, so the URL mirror waits
 * for a pause instead of replacing the URL on each change. localStorage is written
 * immediately by the callers, so nothing is lost if the user leaves before the URL updates.
 */
const DELAY_MS = 400;

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: { router: Router; href: string } | undefined;

/** Returns the href that is now (or about to be) in the address bar, if one was pending. */
function apply(): string | undefined {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  const p = pending;
  pending = undefined;
  if (!p) return undefined;
  const path = p.href.split("?")[0];
  // The user may have moved to another tab meanwhile: never pull them back.
  if (window.location.pathname !== path) return undefined;
  if (`${window.location.pathname}${window.location.search}` !== p.href) {
    void p.router.navigate({ href: p.href, replace: true, resetScroll: false });
  }
  return p.href;
}

/** Replace the current URL with `href` once changes settle. */
export function scheduleUrlReplace(router: Router, href: string) {
  pending = { router, href };
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(apply, DELAY_MS);
}

/**
 * Apply a pending URL update now and return the full URL to share. The router commits the
 * navigation asynchronously, so callers must use this return value, not window.location.href.
 */
export function flushUrlSync(): string {
  const href = apply();
  return href ? `${window.location.origin}${href}` : window.location.href;
}
