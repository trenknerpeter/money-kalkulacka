import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A date read at module load is evaluated once on the server, before any request, when the
 * clock is not the real date. The Retirement page shipped with `const CURRENT_YEAR =
 * new Date().getFullYear()` at the top and the server rendered it for the wrong year, which
 * also broke hydration. Read the date inside the component or a function instead.
 */
describe("routes do not read the date at module load", () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

  it.each(files)("%s", (file) => {
    const source = readFileSync(join(dir, file), "utf8");
    // A top-level (unindented) declaration whose value is a Date read.
    const offenders = source
      .split("\n")
      .filter((line) => /^(export )?(const|let|var) .*(new Date\(|Date\.now\()/.test(line));
    expect(offenders).toEqual([]);
  });
});
