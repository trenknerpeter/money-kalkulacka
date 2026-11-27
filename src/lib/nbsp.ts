const NBSP = " ";

// Units that must stay on the same line as the number before them.
const EXACT_UNITS = "Kč|%|€|CZK|EUR|let|roků|roky|roku|měsíců|měsíce|years|months";
// Word stems that take any ending ("miliony", "milionů", "miliardy", "million").
const STEM_UNITS = "milion|million|miliard|billion";

const THOUSANDS_GAP = /(\d) (?=\d{3}(?!\d))/g;
const UNIT_GAP = new RegExp(`(\\d) (?=(?:${EXACT_UNITS})(?![\\p{L}])|(?:${STEM_UNITS}))`, "gu");

/**
 * Swap the ordinary spaces inside written-out figures for no-break spaces, so
 * "42 397 Kč" or "24,8 %" never splits across two lines. Intl-formatted values
 * already use U+00A0; this is for hand-written copy.
 */
export function bindNumbers(text: string): string {
  return text.replace(THOUSANDS_GAP, `$1${NBSP}`).replace(UNIT_GAP, `$1${NBSP}`);
}
