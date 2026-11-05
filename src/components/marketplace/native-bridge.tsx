"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Actif uniquement dans l'app native (Capacitor) ; sans effet sur le site web et la PWA.
export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.documentElement.dataset.native = Capacitor.getPlatform();
    const cleanups: (() => void)[] = [];
    (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);
      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) window.history.back();
        else void App.exitApp();
      });
      cleanups.push(() => void back.remove());
      await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      await SplashScreen.hide().catch(() => {});
    })();
    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}
