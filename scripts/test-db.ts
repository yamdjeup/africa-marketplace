// Prépare la base de test jetable : mêmes migrations que la production (migrate deploy) + seed.
import { spawnSync } from "node:child_process";
import { requireSandboxStripe, requireTestDatabaseUrl } from "./test-env";
import { UNREACHABLE_HELP, isUnreachable, retry, tcpProbe, withConnectTimeout } from "./db-wake";

async function main() {
  const url = withConnectTimeout(requireTestDatabaseUrl());
  requireSandboxStripe();
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  const onRetry = (n: number) => console.log(`[test-db] base injoignable (compute Neon en veille ?) — nouvel essai ${n}…`);

  console.log("[test-db] réveil de la base…");
  // Sans client Prisma : en CI il est généré en sqlite et refuse une URL postgresql.
  await retry(() => tcpProbe(url), { onRetry });

  for (const args of [["scripts/db.mjs", "deploy"], ["scripts/db.mjs", "seed"]]) {
    await retry(
      async () => {
        const r = spawnSync("node", args, { env, shell: true, encoding: "utf8" });
        const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
        process.stdout.write(out);
        if (r.status !== 0) throw new Error(out || `exit ${r.status}`);
      },
      { delaysMs: [3000, 6000, 12000], onRetry, retryable: (e) => isUnreachable(String((e as Error).message)) },
    );
  }
  console.log("[test-db] base de test prête.");
}

main().catch((e) => {
  const msg = String((e as Error)?.message ?? e);
  console.error(isUnreachable(msg) ? `[test-db] ${UNREACHABLE_HELP}` : `[test-db] ${msg}`);
  process.exit(1);
});
