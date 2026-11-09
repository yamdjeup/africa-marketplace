// Mur de mot de passe de la démonstration privée (gratuit, sans protection payante de Vercel).
// Compatible runtime Edge/Node : uniquement Web Crypto.

export const ACCESS_COOKIE = "site_access";
export const ACCESS_PATH = "/acces";
export const ACCESS_MAX_AGE_S = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

export function accessPassword(): string {
  return process.env.SITE_ACCESS_PASSWORD ?? "";
}

// Sans SITE_ACCESS_SECRET, le mot de passe sert de clé : le changer déconnecte tout le monde.
function signingKey(): string {
  return process.env.SITE_ACCESS_SECRET || accessPassword();
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparaison en temps constant : on compare des empreintes de longueur fixe.
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

export async function checkPassword(candidate: string): Promise<boolean> {
  return safeEqual(candidate, accessPassword());
}

export async function createToken(now = Date.now()): Promise<string> {
  const expires = String(now + ACCESS_MAX_AGE_S * 1000);
  return `v1.${expires}.${await sign(`v1.${expires}`)}`;
}

export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [version, expires, signature] = token.split(".");
  if (version !== "v1" || !expires || !signature) return false;
  if (!(Number(expires) > now)) return false;
  return safeEqual(signature, await sign(`v1.${expires}`));
}

// Redirection post-connexion limitée aux chemins du site (pas de redirection ouverte).
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/fr";
  if (value === ACCESS_PATH || value.startsWith(`${ACCESS_PATH}?`)) return "/fr";
  return value;
}

const texts = {
  fr: {
    title: "Accès réservé",
    lead: "Accès réservé. Saisissez le mot de passe qui vous a été communiqué.",
    label: "Mot de passe",
    submit: "Entrer",
    error: "Mot de passe incorrect.",
    meaning: "« Tu es très belle » en ghomálá’",
    other: "English",
  },
  en: {
    title: "Private access",
    lead: "Restricted access. Enter the password you were given.",
    label: "Password",
    submit: "Enter",
    error: "Incorrect password.",
    meaning: "“You are very beautiful” in ghomálá’",
    other: "Français",
  },
} as const;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function accessPageHtml(locale: "fr" | "en", next: string, failed: boolean): string {
  const t = texts[locale];
  const otherLocale = locale === "fr" ? "en" : "fr";
  const nextParam = encodeURIComponent(next);
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${t.title} — E póm ta’</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
    background: oklch(0.975 0.012 85); color: oklch(0.22 0.02 50);
    font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 26rem; text-align: center; }
  h1 { font-family: "Playfair Display", Georgia, "Times New Roman", serif; font-weight: 600;
    font-size: 2.25rem; margin: 0; }
  .meaning { margin: .25rem 0 2rem; font-size: .875rem; color: oklch(0.45 0.02 50); }
  p { line-height: 1.5; }
  form { display: grid; gap: .75rem; text-align: left; margin-top: 1.5rem; }
  label { font-size: .875rem; font-weight: 500; }
  input { width: 100%; padding: .75rem; font-size: 1rem; border: 1px solid oklch(0.78 0.02 80);
    border-radius: .5rem; background: #fff; color: inherit; }
  button { padding: .75rem; font-size: 1rem; font-weight: 500; border: 0; border-radius: .5rem;
    background: oklch(0.32 0.09 265); color: #fff; cursor: pointer; }
  input:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid oklch(0.55 0.15 265); outline-offset: 2px; }
  .error { margin: 0; color: oklch(0.45 0.18 27); font-size: .875rem; }
  .lang { display: inline-block; margin-top: 1.5rem; font-size: .875rem; color: oklch(0.32 0.09 265); }
</style>
</head>
<body>
<main>
  <h1>E póm ta’</h1>
  <h2 style="font-size:1.125rem;margin:1.5rem 0 0">${escapeHtml(t.title)}</h2>
  <p>${escapeHtml(t.lead)}</p>
  <form method="post" action="${ACCESS_PATH}?lang=${locale}">
    <input type="hidden" name="next" value="${escapeHtml(next)}">
    <label for="password">${escapeHtml(t.label)}</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus${failed ? ' aria-describedby="err" aria-invalid="true"' : ""}>
    ${failed ? `<p id="err" class="error" role="alert">${escapeHtml(t.error)}</p>` : ""}
    <button type="submit">${escapeHtml(t.submit)}</button>
  </form>
  <a class="lang" href="${ACCESS_PATH}?lang=${otherLocale}&amp;next=${nextParam}">${escapeHtml(t.other)}</a>
</main>
</body>
</html>`;
}
