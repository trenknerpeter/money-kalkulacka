import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cz.moneykalkulacka.app",
  appName: "Money Kalkulačka",
  webDir: "dist/client",
  ios: {
    // The page paints its own background edge to edge; safe areas are handled in CSS.
    contentInset: "never",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#f7f6f2",
    },
  },
};

export default config;
