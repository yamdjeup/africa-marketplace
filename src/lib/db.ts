import "server-only";
import { PrismaClient } from "@prisma/client";
import { join } from "node:path";

// Sans DATABASE_URL, repli sur la base SQLite locale créée par `npm run db:setup`.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${join(process.cwd(), "prisma", ".dev", "dev.db").replace(/\\/g, "/")}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
