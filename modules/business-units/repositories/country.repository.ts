import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type CountryDatabaseClient = Pick<
  TransactionClient,
  "bitacora" | "paises" | "unidades_negocio"
>;

export class CountryRepository {
  constructor(private readonly database: CountryDatabaseClient = prisma) {}

  list() {
    return this.database.paises.findMany({
      select: {
        id: true,
        nombre: true,
        codigo_iso: true,
        estado: true,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findById(countryId: string) {
    return this.database.paises.findUnique({
      where: { id: countryId },
      select: {
        id: true,
        nombre: true,
        codigo_iso: true,
        estado: true,
      },
    });
  }

  findDuplicate(name: string, isoCode: string) {
    return this.database.paises.findFirst({
      where: {
        OR: [{ nombre: name }, { codigo_iso: isoCode }],
      },
      select: {
        id: true,
        nombre: true,
        codigo_iso: true,
      },
    });
  }

  countActiveUnits(countryId: string) {
    return this.database.unidades_negocio.count({
      where: {
        pais_id: countryId,
        estado: "activo",
      },
    });
  }

  create(data: Prisma.paisesUncheckedCreateInput) {
    return this.database.paises.create({
      data,
      select: {
        id: true,
        nombre: true,
        codigo_iso: true,
        estado: true,
      },
    });
  }

  update(countryId: string, data: Prisma.paisesUncheckedUpdateInput) {
    return this.database.paises.update({
      where: { id: countryId },
      data,
      select: {
        id: true,
        nombre: true,
        codigo_iso: true,
        estado: true,
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
