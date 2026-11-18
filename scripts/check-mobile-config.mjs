// Contrôle avant OTA/build : node scripts/check-mobile-config.mjs
// Échoue si mobile/app.json ou mobile/eas.json perd la config attendue (slug, EAS, mises à jour, Google).
import { readFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL(`../mobile/${f}`, import.meta.url), "utf8"));
const app = read("app.json").expo ?? {};
const eas = read("eas.json");
const errors = [];
const need = (ok, msg) => { if (!ok) errors.push(msg); };

need(app.slug === "afrique-marketplace", `slug attendu ? afrique-marketplace ? (celui du projet EAS), trouv? ? ${app.slug} ? : ne jamais faire git checkout -- mobile/app.json`);
need(app.owner === "epomta-app", "owner doit ?tre epomta-app");
need(app.extra?.eas?.projectId === "6b0ae666-4795-4bfc-b96f-060673117e1f", "extra.eas.projectId doit ?tre 6b0ae666-4795-4bfc-b96f-060673117e1f");
need(app.android?.package === "com.epomta.app", "android.package doit être com.epomta.app");
need(app.android?.googleServicesFile, "android.googleServicesFile manquant");
need(app.runtimeVersion?.policy === "appVersion", "runtimeVersion.policy doit être appVersion");
need(app.updates?.enabled === true, "updates.enabled doit être true");
const projectId = app.extra?.eas?.projectId;
need(/^[0-9a-f-]{36}$/i.test(projectId ?? ""), "extra.eas.projectId manquant (lancer eas init)");
need(projectId && app.updates?.url === `https://u.expo.dev/${projectId}`, "updates.url doit valoir https://u.expo.dev/<projectId>");

const KEYS = ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"];
for (const profile of ["preview", "production"]) {
  for (const k of KEYS) need(eas.build?.[profile]?.env?.[k], `eas.json build.${profile}.env.${k} manquant`);
}
for (const k of ["EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "EXPO_PUBLIC_API_URL"]) {
  need(process.env[k], `variable d'environnement ${k} absente du shell : elle serait absente du bundle OTA (le bouton Google disparaît)`);
}

if (errors.length) {
  console.error("Config mobile invalide :\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("Config mobile OK");
