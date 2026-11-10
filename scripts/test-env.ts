import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);
const PROTECTED = ["DATABASE_URL", "DIRECT_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"];

function envFileValues() {
  const out: Record<string, string> = {};
  for (const file of [".env", ".env.local", ".env.production", ".env.vercel"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return out;
}

const identity = (u: string) => {
  try {
    const p = new URL(u);
    return `${p.hostname}:${p.port || "5432"}${p.pathname}`.toLowerCase();
  } catch {
    return u;
  }
};

/** Garde-fou : refuse toute base qui pourrait être la production. Retourne l'URL validée. */
export function requireTestDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const url = env.TEST_DATABASE_URL ?? "";
  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error("TEST_DATABASE_URL absent ou invalide (attendu : postgresql://...). Voir docs/DEPLOIEMENT.md, section Tests automatisés.");
  const p = new URL(url);
  const dbName = p.pathname.replace(/^\//, "");
  const known = { ...envFileValues(), ...Object.fromEntries(PROTECTED.map((k) => [k, env[k] ?? ""])) };
  for (const k of PROTECTED) {
    const v = known[k];
    if (v && /^postgres/.test(v) && identity(v) === identity(url)) throw new Error(`REFUS : TEST_DATABASE_URL pointe vers la même base que ${k} (production ?).`);
  }
  if (/prod/i.test(dbName) || /prod/i.test(p.hostname)) throw new Error("REFUS : le nom de la base ou l'hôte contient « prod ».");
  const local = LOCAL_HOSTS.has(p.hostname);
  if (!local && !/test/i.test(dbName)) throw new Error("REFUS : une base distante doit avoir « test » dans son nom (branche Neon dédiée aux tests).");
  return url;
}

/** Les tests ne doivent jamais utiliser une clé Stripe live. */
export function requireSandboxStripe(env: Record<string, string | undefined> = process.env) {
  if (/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? "")) throw new Error("REFUS : clé Stripe live détectée ; les tests utilisent uniquement le mode test.");
}
