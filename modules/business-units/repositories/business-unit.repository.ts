import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type BusinessUnitDatabaseClient = Pick<
  TransactionClient,
  "bitacora" | "paises" | "unidades_negocio"
>;

export class BusinessUnitRepository {
  constructor(
    private readonly database: BusinessUnitDatabaseClient = prisma,
  ) {}

  listActive() {
    return this.database.unidades_negocio.findMany({
      where: { estado: "activo" },
      select: {
        id: true,
        nombre: true,
        moneda: true,
        paises: {
          select: {
            id: true,
            nombre: true,
            codigo_iso: true,
          },
        },
      },
      orderBy: [
        { paises: { nombre: "asc" } },
        { nombre: "asc" },
        { id: "asc" },
      ],
    });
  }

  list() {
    return this.database.unidades_negocio.findMany({
      select: {
        id: true,
        nombre: true,
        moneda: true,
        estado: true,
        paises: {
          select: {
            id: true,
            nombre: true,
            codigo_iso: true,
          },
        },
      },
      orderBy: [
        { paises: { nombre: "asc" } },
        { nombre: "asc" },
        { id: "asc" },
      ],
    });
  }

  findById(unitId: string) {
    return this.database.unidades_negocio.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        nombre: true,
        moneda: true,
        estado: true,
        paises: {
          select: {
            id: true,
            nombre: true,
            codigo_iso: true,
            estado: true,
          },
        },
      },
    });
  }

  findDuplicate(name: string, countryId: string) {
    return this.database.unidades_negocio.findUnique({
      where: {
        nombre_pais_id: {
          nombre: name,
          pais_id: countryId,
        },
      },
      select: { id: true },
    });
  }

  findActiveCountry(countryId: string) {
    return this.database.paises.findFirst({
      where: {
        id: countryId,
        estado: "activo",
      },
      select: { id: true },
    });
  }

  create(data: Prisma.unidades_negocioUncheckedCreateInput) {
    return this.database.unidades_negocio.create({
      data,
      select: {
        id: true,
        nombre: true,
        moneda: true,
        estado: true,
        paises: {
          select: {
            id: true,
            nombre: true,
            codigo_iso: true,
          },
        },
      },
    });
  }

  update(
    unitId: string,
    data: Prisma.unidades_negocioUncheckedUpdateInput,
  ) {
    return this.database.unidades_negocio.update({
      where: { id: unitId },
      data,
      select: {
        id: true,
        nombre: true,
        moneda: true,
        estado: true,
        paises: {
          select: {
            id: true,
            nombre: true,
            codigo_iso: true,
          },
        },
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
