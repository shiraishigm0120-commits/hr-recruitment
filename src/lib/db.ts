import { PrismaClient } from "@/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

let adapter: any;

if (dbUrl.startsWith("postgres")) {
  // Vercel Postgres or any PostgreSQL
  const { PrismaPg } = await import("@prisma/adapter-pg");
  adapter = new PrismaPg({ connectionString: dbUrl });
} else {
  // SQLite / Turso (libsql:// or file:)
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  adapter = new PrismaLibSql({ url: dbUrl });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
