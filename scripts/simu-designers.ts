// Import (ou --remove) des créateurs d'illustration sur la base SIMU uniquement.
// Usage : set SIMU_DATABASE_URL=postgresql://... puis npm run db:simu-designers [-- --remove]
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importSimuDesigners, removeSimuDesigners, type SimuDesigner } from "../src/lib/simu-designers";

const url = process.env.SIMU_DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(url)) throw new Error("SIMU_DATABASE_URL absent ou invalide : cible la base simu uniquement (jamais prod).");
const protectedUrls = [process.env.DATABASE_URL, process.env.PROD_DATABASE_URL].filter(Boolean);
if (process.env.PROD_DATABASE_URL === url || (process.env.CONFIRM_NOT_PROD !== "1" && protectedUrls.includes(url)))
  throw new Error("REFUS : la base cible ressemble à la production (DATABASE_URL/PROD_DATABASE_URL). Définissez CONFIRM_NOT_PROD=1 seulement si DATABASE_URL est bien la base simu.");

const db = new PrismaClient({ datasourceUrl: url }) as unknown as Parameters<typeof removeSimuDesigners>[0] & { $disconnect(): Promise<void> };
async function main() {
  if (process.argv.includes("--remove")) console.log(`supprimés : ${await removeSimuDesigners(db)}`);
  else {
    const list = JSON.parse(readFileSync("prisma/simu-designers.json", "utf8")) as SimuDesigner[];
    console.log(`importés/mis à jour : ${await importSimuDesigners(db, list)}`);
  }
}
main().finally(() => db.$disconnect());
