/**
 * Same-page signal that a calculator tab's stored numbers changed. The browser's own
 * `storage` event only fires in *other* tabs, so the nav badge listens for this too.
 */
export const DATA_CHANGED_EVENT = "finbuddy:data-changed";

export function notifyDataChanged() {
  try {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}
