// Prépare la base de test jetable : mêmes migrations que la production (migrate deploy) + seed.
import { spawnSync } from "node:child_process";
import { requireSandboxStripe, requireTestDatabaseUrl } from "./test-env";

const url = requireTestDatabaseUrl();
requireSandboxStripe();
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
for (const args of [["scripts/db.mjs", "deploy"], ["scripts/db.mjs", "seed"]]) {
  const r = spawnSync("node", args, { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log("[test-db] base de test prête.");
