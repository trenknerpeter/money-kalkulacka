import { useEffect, useRef, useState } from "react";

/**
 * Eases a displayed number towards `target` over `duration` ms, so a changed result
 * counts to its new value instead of snapping. Starts at the target (no animation on
 * first paint or on the server) and skips the motion for people who asked for less.
 */
export function useCountUp(target: number, duration = 260): number {
  const [display, setDisplay] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !isFinite(target) || !isFinite(current.current) || current.current === target) {
      current.current = target;
      setDisplay(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = p >= 1 ? target : from + (target - from) * eased;
      current.current = value;
      setDisplay(value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Animation frames stop in background tabs; this timer guarantees the exact value is shown.
    const done = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      current.current = target;
      setDisplay(target);
    }, duration + 60);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [target, duration]);

  return display;
}
