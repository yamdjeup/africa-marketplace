// Archive les anciennes commandes jamais payées (voir src/lib/archive-unpaid.ts).
// Usage : npx tsx scripts/archive-unpaid-orders.ts [--execute]
import { PrismaClient } from "@prisma/client";
import { archiveUnpaidOrders } from "../src/lib/archive-unpaid";

const db = new PrismaClient();
archiveUnpaidOrders(db, process.argv.includes("--execute"))
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .finally(() => db.$disconnect());