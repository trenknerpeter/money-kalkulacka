import { describe, expect, it } from "vitest";
import { bindNumbers } from "./nbsp";

const n = (s: string) => s.replace(/_/g, " ");

describe("bindNumbers", () => {
  it("binds thousands groups and the currency", () => {
    expect(bindNumbers("vzroste na 42 397 Kč.")).toBe(n("vzroste na 42_397_Kč."));
    expect(bindNumbers("strop 2 350 416 Kč ročně")).toBe(n("strop 2_350_416_Kč ročně"));
  });

  it("binds percentages with a decimal comma", () => {
    expect(bindNumbers("odvede 24,8 % na sociální")).toBe(n("odvede 24,8_% na sociální"));
  });

  it("binds years, months and word amounts", () => {
    expect(bindNumbers("za 25 let a 120 months")).toBe(n("za 25_let a 120_months"));
    expect(bindNumbers("zvýší částku o 3 miliony")).toBe(n("zvýší částku o 3_miliony"));
  });

  it("leaves ordinary spaces alone", () => {
    expect(bindNumbers("v roce 2026 a 5 dětí")).toBe("v roce 2026 a 5 dětí");
    expect(bindNumbers("12 hours, 1234 people")).toBe("12 hours, 1234 people");
    expect(bindNumbers("5 letos")).toBe("5 letos");
  });

  it("is idempotent", () => {
    const once = bindNumbers("9 000 000 Kč");
    expect(bindNumbers(once)).toBe(once);
  });
});
