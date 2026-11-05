import type { CapacitorConfig } from "@capacitor/cli";

// Le site reste servi par Vercel (un seul code) : l'app native est une coque WebView qui charge server.url.
const config: CapacitorConfig = {
  appId: "com.epomta.app",
  appName: "E póm ta’",
  webDir: "native-www",
  server: {
    url: "https://epomta-demo.vercel.app",
    cleartext: false,
    errorPath: "offline.html",
    allowNavigation: ["epomta-demo.vercel.app", "accounts.google.com", "*.googleusercontent.com", "flagcdn.com", "photon.komoot.io"],
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1500, backgroundColor: "#1c3060", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#faf6ee" },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
