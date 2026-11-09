"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "epomta_consent";
const MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000; // 13 mois
const GA_COOKIE_SECONDS = 390 * 24 * 60 * 60; // < 13 mois
export const OPEN_EVENT = "epomta:cookie-settings";

type Choice = { v: 1; analytics: boolean; ts: number };
type GaWindow = Window & { dataLayer?: unknown[]; __epomtaConsent?: boolean } & Record<string, unknown>;

function readChoice(): Choice | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? "null") as Choice | null;
    if (!c || c.v !== 1 || typeof c.ts !== "number" || Date.now() - c.ts > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

function deleteGaCookies() {
  const host = location.hostname;
  const parts = host.split(".");
  const domains = ["", host, `.${host}`];
  if (parts.length > 2) domains.push(`.${parts.slice(-2).join(".")}`);
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const d of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

const TXT = {
  fr: {
    title: "Vos choix de cookies",
    body: "Nous utilisons des cookies strictement nécessaires au fonctionnement du site. Avec votre accord, nous utilisons aussi Google Analytics pour mesurer l'audience du site. Vous pouvez modifier votre choix à tout moment via « Gestion des cookies ».",
    acceptAll: "Tout accepter",
    refuseAll: "Tout refuser",
    custom: "Personnaliser",
    save: "Enregistrer mes choix",
    necessary: "Strictement nécessaires",
    necessaryDesc: "Session, panier, langue : toujours actifs.",
    analytics: "Mesure d'audience",
    analyticsDesc: "Google Analytics (cookies _ga et _ga_*, 13 mois maximum) : statistiques de fréquentation agrégées.",
    ads: "Publicité",
    adsDesc: "Désactivée : aucune publicité n'est utilisée sur ce site.",
    more: "En savoir plus",
  },
  en: {
    title: "Your cookie choices",
    body: "We use cookies that are strictly necessary for the site to work. With your consent, we also use Google Analytics to measure site audience. You can change your choice at any time via “Cookie management”.",
    acceptAll: "Accept all",
    refuseAll: "Refuse all",
    custom: "Customise",
    save: "Save my choices",
    necessary: "Strictly necessary",
    necessaryDesc: "Session, cart, language: always active.",
    analytics: "Audience measurement",
    analyticsDesc: "Google Analytics (_ga and _ga_* cookies, 13 months maximum): aggregated traffic statistics.",
    ads: "Advertising",
    adsDesc: "Off: no advertising is used on this site.",
    more: "Learn more",
  },
} as const;

export function CookieConsent({ locale, gaId }: { locale: string; gaId: string }) {
  const t = TXT[locale === "en" ? "en" : "fr"];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const loaded = useRef(false);
  const granted = useRef(false);
  const lastPath = useRef<string | null>(null);

  const gtag = useCallback((...args: unknown[]) => {
    const w = window as unknown as GaWindow;
    w.dataLayer = w.dataLayer ?? [];
    // gtag.js attend l'objet `arguments`, pas un tableau
    (function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    }).apply(null, args);
  }, []);

  const apply = useCallback(
    (on: boolean) => {
      const w = window as unknown as GaWindow;
      if (on) {
        w[`ga-disable-${gaId}`] = false;
        gtag("consent", "update", { analytics_storage: "granted" });
        if (!loaded.current) {
          loaded.current = true;
          const s = document.createElement("script");
          s.async = true;
          s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
          document.head.appendChild(s);
          gtag("js", new Date());
          gtag("config", gaId, {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            cookie_expires: GA_COOKIE_SECONDS,
          });
        }
        granted.current = true;
      } else {
        granted.current = false;
        if (loaded.current) {
          w[`ga-disable-${gaId}`] = true;
          gtag("consent", "update", { analytics_storage: "denied" });
        }
        deleteGaCookies();
      }
    },
    [gaId, gtag],
  );

  useEffect(() => {
    // Consent Mode v2 : tout refusé par défaut, avant tout chargement de script
    gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    const c = readChoice();
    /* eslint-disable react-hooks/set-state-in-effect -- lecture du stockage local, impossible au rendu serveur */
    if (c) {
      setAnalytics(c.analytics);
      apply(c.analytics);
    } else {
      setOpen(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    const onOpen = () => {
      setAnalytics(readChoice()?.analytics ?? false);
      setCustom(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    (window as unknown as GaWindow).__epomtaConsent = true;
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      (window as unknown as GaWindow).__epomtaConsent = false;
    };
  }, [apply, gtag]);

  // Pages vues lors des navigations côté client (la première est envoyée par « config »)
  useEffect(() => {
    if (lastPath.current !== null && lastPath.current !== pathname && granted.current) {
      gtag("event", "page_view", { page_path: pathname, page_location: location.href });
    }
    lastPath.current = pathname;
  }, [pathname, gtag]);

  function save(a: boolean) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, analytics: a, ts: Date.now() } satisfies Choice));
    } catch {
      /* stockage indisponible : le choix vaut pour cette page seulement */
    }
    setAnalytics(a);
    apply(a);
    setOpen(false);
    setCustom(false);
  }

  if (!open) return null;
  const btn = "h-11 flex-1 rounded-md border border-black px-4 text-sm font-medium hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background p-4 shadow-lg">
      <div className="mx-auto max-w-3xl space-y-3 text-sm">
        <h2 id="cookie-title" className="font-semibold">{t.title}</h2>
        <p>
          {t.body}{" "}
          <a href={`/${locale}/support/cookies`} className="underline">{t.more}</a>
        </p>
        {custom && (
          <ul className="space-y-2">
            <li className="flex items-start justify-between gap-3">
              <span><strong>{t.necessary}</strong><br />{t.necessaryDesc}</span>
              <input type="checkbox" checked disabled aria-label={t.necessary} className="mt-1 size-5" />
            </li>
            <li className="flex items-start justify-between gap-3">
              <label htmlFor="cc-analytics"><strong>{t.analytics}</strong><br />{t.analyticsDesc}</label>
              <input id="cc-analytics" type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 size-5" />
            </li>
            <li className="flex items-start justify-between gap-3">
              <label htmlFor="cc-ads"><strong>{t.ads}</strong><br />{t.adsDesc}</label>
              <input id="cc-ads" type="checkbox" checked={false} disabled className="mt-1 size-5" />
            </li>
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={btn} onClick={() => save(false)}>{t.refuseAll}</button>
          {custom ? (
            <button type="button" className={btn} onClick={() => save(analytics)}>{t.save}</button>
          ) : (
            <button type="button" className={btn} onClick={() => setCustom(true)}>{t.custom}</button>
          )}
          <button type="button" className={btn} onClick={() => save(true)}>{t.acceptAll}</button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if ((window as unknown as GaWindow).__epomtaConsent) {
          e.preventDefault();
          window.dispatchEvent(new Event(OPEN_EVENT));
        }
      }}
    >
      {label}
    </a>
  );
}
