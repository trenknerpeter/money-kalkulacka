import { Capacitor } from "@capacitor/core";

/**
 * Haptic feedback for the iOS app. Every function is a silent no-op on the web,
 * and the plugin is only loaded inside the native shell, so the website pays nothing.
 */

/** Controls that give a light tap when pressed. Disabled controls never do. */
export const TAP_SELECTOR =
  'button, a[href], [role="tab"], [role="switch"], [role="radio"], [role="menuitem"], [role="option"]';

type Closest = { closest(selector: string): Closest | null; matches(selector: string): boolean };

/** The control a click landed on that should give a tap, or null. Opt out with data-haptic="none". */
export function tapTarget<T extends Closest>(start: T | null): T | null {
  const el = (start?.closest(TAP_SELECTOR) ?? null) as T | null;
  if (!el) return null;
  if (el.matches(':disabled, [aria-disabled="true"]')) return null;
  if (el.closest('[data-haptic="none"]')) return null;
  return el;
}

/** Returns a gate that lets a call through at most once per `minMs`. */
export function createThrottle(minMs: number, now: () => number = Date.now) {
  let last = -Infinity;
  return () => {
    const t = now();
    if (t - last < minMs) return false;
    last = t;
    return true;
  };
}

type Plugin = typeof import("@capacitor/haptics");
let plugin: Promise<Plugin | null> | undefined;

function load(): Promise<Plugin | null> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(null);
  plugin ??= import("@capacitor/haptics").catch(() => null);
  return plugin;
}

function run(fn: (p: Plugin) => Promise<void>) {
  void load().then((p) => (p ? fn(p).catch(() => {}) : undefined));
}

const slideGate = createThrottle(45);

export const haptic = {
  /** A light tap: buttons, tabs, switches, chips. */
  tap() {
    run((p) => p.Haptics.impact({ style: p.ImpactStyle.Light }));
  },
  /** One tick per slider step, rate-limited so a fast drag feels like a ratchet, not a buzz. */
  tick() {
    if (slideGate()) run((p) => p.Haptics.impact({ style: p.ImpactStyle.Light }));
  },
  /** Something worked, e.g. a link was copied. */
  success() {
    run((p) => p.Haptics.notification({ type: p.NotificationType.Success }));
  },
};

/**
 * One listener for the whole app: any click on a real control gives a tap.
 * Capture phase, so it still fires when a component stops propagation.
 */
export function installTapHaptics(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.target instanceof Element && tapTarget(e.target)) haptic.tap();
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
