import { useEffect, type ReactNode } from "react";
import posthog, { type CaptureResult, type Properties } from "posthog-js";
import { PostHogProvider } from "@posthog/react";

const KEY = import.meta.env["VITE_PUBLIC_POSTHOG_KEY"] as string | undefined;
const HOST =
  (import.meta.env["VITE_PUBLIC_POSTHOG_HOST"] as string | undefined) ?? "https://eu.i.posthog.com";

// Every calculator mirrors its inputs (salary, loan size, savings…) into the query string,
// and share links carry a whole encoded snapshot in `?s=`. The site promises that numbers
// stay in the browser, so strip query strings and fragments from every URL-ish property.
function stripQuery(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const u = new URL(value);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return value.split(/[?#]/)[0];
  }
}

function scrub(props: Properties | undefined) {
  if (!props) return;
  for (const key of Object.keys(props)) {
    if (/url|referrer|href/i.test(key)) props[key] = stripQuery(props[key]);
  }
}

function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  scrub(event.properties);
  scrub(event.$set);
  scrub(event.$set_once);
  return event;
}

let initialized = false;

function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!KEY) {
    if (import.meta.env.DEV) {
      console.error(
        "VITE_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_KEY is configured",
      );
    }
    return;
  }
  posthog.init(KEY, {
    api_host: HOST,
    defaults: "2026-05-30",
    capture_exceptions: true,
    // Replays would record the numbers people type in; keep them out.
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    persistence: "localStorage+cookie",
    before_send: beforeSend,
  });
  initialized = true;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(initPostHog, []);
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

/** Capture a product event. A no-op when PostHog isn't configured or on the server. */
export function track(event: string, properties?: Properties) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackError(error: unknown, properties?: Properties) {
  if (!initialized) return;
  posthog.captureException(error, properties);
}
