import { PrismaClient } from "@prisma/client";

/** Один клиент Prisma на процесс (в dev Next.js перезагружает модули, поэтому кэшируем в globalThis) */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
