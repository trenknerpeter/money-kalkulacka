// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// `npm run build:ios` sets this. The iOS app has no server, so it gets a static
// SPA shell instead of the Cloudflare SSR bundle. The web build is unchanged.
const isNativeBuild = process.env["BUILD_TARGET"] === "native";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isNativeBuild && {
      spa: { enabled: true, prerender: { outputPath: "/index.html" } },
    }),
  },
  ...(isNativeBuild && { nitro: false }),
});
