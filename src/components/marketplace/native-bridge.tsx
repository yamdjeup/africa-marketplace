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
      const [{ App }, { StatusBar, Style }, { SplashScreen }, { Haptics, ImpactStyle }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/haptics"),
      ]);
      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) window.history.back();
        else void App.exitApp();
      });
      cleanups.push(() => void back.remove());
      await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      await SplashScreen.hide().catch(() => {});
      const tap = (e: Event) => {
        if ((e.target as HTMLElement | null)?.closest("button, [role=button], [role=tab], a[href]")) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      };
      document.addEventListener("click", tap, { passive: true });
      cleanups.push(() => document.removeEventListener("click", tap));
    })();
    return () => cleanups.forEach((c) => c());
  }, []);
  return null;
}
