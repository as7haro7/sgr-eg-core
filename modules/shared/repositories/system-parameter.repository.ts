import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type SystemParameterDatabaseClient = Pick<
  TransactionClient,
  "bitacora" | "parametros_sistema"
>;

export class SystemParameterRepository {
  constructor(
    private readonly database: SystemParameterDatabaseClient = prisma,
  ) {}

  list() {
    return this.database.parametros_sistema.findMany({
      select: {
        clave: true,
        valor: true,
        descripcion: true,
        updated_at: true,
      },
      orderBy: { clave: "asc" },
    });
  }

  findByKey(key: string) {
    return this.database.parametros_sistema.findUnique({
      where: { clave: key },
      select: {
        clave: true,
        valor: true,
        descripcion: true,
        updated_at: true,
      },
    });
  }

  create(data: Prisma.parametros_sistemaUncheckedCreateInput) {
    return this.database.parametros_sistema.create({
      data,
      select: {
        clave: true,
        valor: true,
        descripcion: true,
        updated_at: true,
      },
    });
  }

  update(
    key: string,
    data: Prisma.parametros_sistemaUncheckedUpdateInput,
  ) {
    return this.database.parametros_sistema.update({
      where: { clave: key },
      data,
      select: {
        clave: true,
        valor: true,
        descripcion: true,
        updated_at: true,
      },
    });
  }

  recordAudit(data: Prisma.bitacoraUncheckedCreateInput) {
    return this.database.bitacora.create({
      data,
      select: { id: true },
    });
  }
}
