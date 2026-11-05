"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDict, type Locale } from "@/lib/i18n";

const KEY = "epomta-alert-prefs";
type Prefs = { email: boolean; promo: boolean };

function Switch({ id, label, checked, disabled, onChange, hint }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>
        {label}
        {hint && <span className="ml-2 text-xs">{hint}</span>}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-muted-foreground/40 transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring relative before:absolute before:left-0.5 before:top-0.5 before:size-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
      />
    </div>
  );
}

// Préférences simulées : stockées sur l'appareil, aucun envoi réel (démo privée).
export function AlertsForm({ locale }: { locale: Locale }) {
  const w = getDict(locale).wishlist;
  const [prefs, setPrefs] = useState<Prefs>({ email: false, promo: false });
  const [account, setAccount] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [push, setPush] = useState<"loading" | "unconfigured" | "unsupported" | "ios" | "denied" | "off" | "on">("loading");
  const [pushKey, setPushKey] = useState("");
  const [pushMsg, setPushMsg] = useState("");
  useEffect(() => {
    void (async () => {
      const cfg = (await fetch("/api/push/subscribe").then((r) => r.json()).catch(() => null)) as { configured?: boolean; publicKey?: string } | null;
      if (!cfg?.configured || !cfg.publicKey) return setPush("unconfigured");
      setPushKey(cfg.publicKey);
      const ua = navigator.userAgent;
      const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (ios && !standalone) return setPush("ios");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setPush("unsupported");
      if (Notification.permission === "denied") return setPush("denied");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub && Notification.permission === "granted" ? "on" : "off");
    })();
  }, []);
  const togglePush = async (v: boolean) => {
    setPushMsg("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if (v) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setPush(perm === "denied" ? "denied" : "off");
        const b64 = pushKey.replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)) });
        const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), locale }) });
        if (!r.ok) {
          await sub.unsubscribe();
          throw new Error("subscribe");
        }
        setPush("on");
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
          await sub.unsubscribe();
        }
        setPush("off");
      }
    } catch {
      setPushMsg(w.pushError);
    }
  };
  const pushHint = push === "unconfigured" || push === "loading" ? w.soon : undefined;
  const pushNote = push === "denied" ? w.pushDenied : push === "unsupported" ? w.pushUnsupported : push === "ios" ? w.pushIos : account === false ? w.pushLogin : "";
  useEffect(() => {
    let local: Partial<Prefs> = {};
    try {
      local = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {}
    fetch("/api/alerts/prefs")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { email: boolean; promo: boolean } | null) => {
        setAccount(!!d);
        setPrefs(d ? { email: d.email, promo: d.promo } : { email: !!local.email, promo: !!local.promo });
      })
      .catch(() => setAccount(false));
  }, []);
  const update = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    if (account) {
      void fetch("/api/alerts/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    } else {
      localStorage.setItem(KEY, JSON.stringify(next));
    }
  };
  const sendTest = async () => {
    setMsg("");
    const r = await fetch(`/api/alerts/test?lang=${locale}`, { method: "POST" }).catch(() => null);
    const s = r ? ((await r.json().catch(() => ({}))) as { status?: string }).status : "failed";
    setMsg(s === "sent" ? w.testSent : s === "rate_limited" ? w.testLimited : s === "unconfigured" ? w.testUnconfigured : w.testFailed);
  };
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href={`/${locale}/favoris`} aria-label={w.back} className="inline-flex size-11 items-center justify-center text-2xl">
        <span aria-hidden="true">←</span>
      </Link>
      <h1 className="font-heading text-3xl font-normal text-primary">{w.alertsTitle}</h1>
      <section aria-labelledby="via" className="divide-y border-y">
        <h2 id="via" className="py-4 text-sm text-muted-foreground">{w.alertsVia}</h2>
        <Switch id="al-push" label={w.push} checked={push === "on"} disabled={!(push === "off" || push === "on") || !account} hint={pushHint} onChange={togglePush} />
        {(pushNote || pushMsg) && <p role="status" className="py-3 text-xs text-muted-foreground">{pushMsg || pushNote}</p>}
        <Switch id="al-email" label={w.email} checked={prefs.email} onChange={(v) => update({ email: v })} />
      </section>
      <section aria-labelledby="more" className="divide-y border-y">
        <h2 id="more" className="py-4 text-sm font-semibold">{w.more}</h2>
        <Switch id="al-promo" label={w.promo} checked={prefs.promo} onChange={(v) => update({ promo: v })} />
      </section>
      <p className="text-xs text-muted-foreground">{w.note}</p>
      {account === false && <p className="text-sm">{w.loginHint}</p>}
      {account && (
        <div>
          <button type="button" onClick={sendTest} className="inline-flex min-h-11 items-center rounded-md border border-black px-5 text-sm hover:bg-black hover:text-white">
            {w.testBtn}
          </button>
          {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
        </div>
      )}
    </div>
  );
}
