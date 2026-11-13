import { describe, expect, it } from "vitest";
import { createThrottle, haptic, tapTarget, TAP_SELECTOR } from "./haptics";

/** A tiny stand-in for a DOM element: just enough for closest()/matches(). */
type Fake = {
  closest(selector: string): Fake | null;
  matches(selector: string): boolean;
};

function fake(opts: {
  tapSelf?: boolean;
  disabled?: boolean;
  optOut?: boolean;
  parent?: Fake | null;
}): Fake {
  const el: Fake = {
    closest(selector) {
      if (selector === TAP_SELECTOR)
        return opts.tapSelf ? el : (opts.parent?.closest(selector) ?? null);
      if (selector === '[data-haptic="none"]') return opts.optOut ? el : null;
      return null;
    },
    matches: () => Boolean(opts.disabled),
  };
  return el;
}

describe("tapTarget", () => {
  it("returns the control for a click on or inside a button", () => {
    const button = fake({ tapSelf: true });
    expect(tapTarget(button)).toBe(button);
    const icon = fake({ parent: button });
    expect(tapTarget(icon)).toBe(button);
  });

  it("ignores clicks that are not on a control", () => {
    expect(tapTarget(fake({}))).toBeNull();
    expect(tapTarget(null)).toBeNull();
  });

  it("ignores disabled controls", () => {
    expect(tapTarget(fake({ tapSelf: true, disabled: true }))).toBeNull();
  });

  it("respects data-haptic=none", () => {
    expect(tapTarget(fake({ tapSelf: true, optOut: true }))).toBeNull();
  });
});

describe("createThrottle", () => {
  it("lets the first call through and blocks calls inside the window", () => {
    let t = 1000;
    const gate = createThrottle(50, () => t);
    expect(gate()).toBe(true);
    t += 49;
    expect(gate()).toBe(false);
    t += 1;
    expect(gate()).toBe(true);
  });

  it("measures from the last allowed call, not the last attempt", () => {
    let t = 0;
    const gate = createThrottle(50, () => t);
    expect(gate()).toBe(true);
    t = 40;
    expect(gate()).toBe(false);
    t = 60;
    expect(gate()).toBe(true);
  });
});

describe("haptic on the web", () => {
  it("is a silent no-op outside the native app", () => {
    expect(() => {
      haptic.tap();
      haptic.tick();
      haptic.success();
    }).not.toThrow();
  });
});
