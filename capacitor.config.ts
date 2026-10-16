import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.panisi.mobile",
  appName: "PINISI",
  webDir: "capacitor-web",
  server: {
    url: "https://panisi.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
