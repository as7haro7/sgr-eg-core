import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";
import { PrismaClient } from "../generated/prisma/client";

const runtimeDatabaseUrl = new URL(env.DATABASE_URL);

if (!runtimeDatabaseUrl.searchParams.has("sslmode")) {
  runtimeDatabaseUrl.searchParams.set("sslmode", "require");
  runtimeDatabaseUrl.searchParams.set("uselibpqcompat", "true");
}

const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: runtimeDatabaseUrl.toString(),
  });

  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
