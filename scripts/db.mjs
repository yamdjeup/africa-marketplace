// Enveloppe Prisma : PostgreSQL (Neon) si DATABASE_URL est défini, sinon SQLite local.
// Usage : node scripts/db.mjs <generate|setup|seed|deploy|check|studio>
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Prisma ne lit que .env ; on charge aussi .env.local (ignoré par git).
for (const file of [".env.local", ".env"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const url = process.env.DATABASE_URL ?? "";
const postgres = /^postgres(ql)?:\/\//.test(url);
const devDir = join(root, "prisma", ".dev");
let schema = join(root, "prisma", "schema.prisma");

if (postgres) {
  console.log("[db] PostgreSQL (DATABASE_URL)");
} else {
  mkdirSync(devDir, { recursive: true });
  const source = readFileSync(schema, "utf8")
    .replace('provider = "postgresql"', 'provider = "sqlite"');
  schema = join(devDir, "schema.prisma");
  writeFileSync(schema, source);
  process.env.DATABASE_URL = `file:${join(devDir, "dev.db").replace(/\\/g, "/")}`;
  console.log("[db] DATABASE_URL absent : base SQLite locale (prisma/.dev/dev.db)");
}

function run(bin, args) {
  const res = spawnSync(bin, args, { cwd: root, stdio: "inherit", env: process.env, shell: true });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const prisma = (...args) => run("npx", ["prisma", ...args]);
const generate = () => prisma("generate", "--schema", schema);
const push = () =>
  postgres
    ? prisma("migrate", "deploy", "--schema", schema)
    : prisma("db", "push", "--schema", schema, "--skip-generate", "--accept-data-loss");
const seed = () => run("npx", ["tsx", "prisma/seed.ts"]);

// Migrations : DIRECT_URL (connexion Neon non poolée) si fournie, sinon DATABASE_URL.
function deploy() {
  if (!postgres) {
    console.error("[db] db:deploy exige une DATABASE_URL PostgreSQL (postgresql://...).");
    process.exit(1);
  }
  generate();
  const direct = process.env.DIRECT_URL ?? "";
  if (/^postgres(ql)?:\/\//.test(direct)) process.env.DATABASE_URL = direct;
  prisma("migrate", "deploy", "--schema", schema);
}

// Vérifie sans base réelle : schéma PostgreSQL valide, migrations PostgreSQL, client générable.
function check() {
  const lock = readFileSync(join(root, "prisma", "migrations", "migration_lock.toml"), "utf8");
  if (!/provider\s*=\s*"postgresql"/.test(lock)) {
    console.error("[db] migration_lock.toml doit déclarer postgresql.");
    process.exit(1);
  }
  if (!postgres) process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/placeholder";
  const canonical = join(root, "prisma", "schema.prisma");
  prisma("validate", "--schema", canonical);
  console.log("[db] Schéma PostgreSQL et migrations valides.");
}

switch (process.argv[2]) {
  case "generate":
    generate();
    break;
  case "push":
    push();
    break;
  case "seed":
    seed();
    break;
  case "examples-add":
  case "examples-remove":
    run("npx", ["tsx", "prisma/seed.examples.ts", process.argv[2] === "examples-add" ? "add" : "remove"]);
    break;
  case "deploy":
    deploy();
    break;
  case "check":
    check();
    break;
  case "setup":
    generate();
    push();
    seed();
    break;
  case "studio":
    prisma("studio", "--schema", schema);
    break;
  default:
    console.error("Usage : node scripts/db.mjs <generate|push|seed|setup|deploy|check|studio>");
    process.exit(1);
}
