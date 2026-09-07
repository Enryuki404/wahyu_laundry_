import { PrismaClient } from "@prisma/client";

// Prisma singleton for Next.js (avoids hot-reload multiple clients)
// For Neon serverless, keep default; switch to @prisma/adapter-neon if driverAdapters needed.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
