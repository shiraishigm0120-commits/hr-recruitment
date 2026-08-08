import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

let adapter: any;

if (dbUrl.startsWith("postgres")) {
  const { PrismaPg } = require("@prisma/adapter-pg");
  adapter = new PrismaPg({ connectionString: dbUrl });
} else {
  adapter = new PrismaLibSql({ url: dbUrl });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
