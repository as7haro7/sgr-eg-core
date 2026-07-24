import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type TransactionClient = Prisma.TransactionClient;

export async function withAuditContext<T>(
  userId: string | null,
  operation: (transaction: TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT set_config('app.user_id', ${userId ?? ""}, true)
    `;

    return operation(transaction);
  });
}
