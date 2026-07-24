import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { BusinessUnitRepository } from "@/modules/business-units/repositories/business-unit.repository";
import type {
  BusinessUnitOption,
  BusinessUnitSummary,
} from "@/modules/business-units/types/business-unit.types";
import type {
  CreateBusinessUnitInput,
  UpdateBusinessUnitInput,
} from "@/modules/business-units/validators/organization.validator";

interface BusinessUnitRecord {
  id: string;
  nombre: string;
  moneda: string;
  estado: "activo" | "inactivo";
  paises: {
    id: string;
    nombre: string;
    codigo_iso: string;
  };
}

function mapBusinessUnit(
  unit: BusinessUnitRecord,
): BusinessUnitSummary {
  return {
    id: unit.id,
    name: unit.nombre,
    currency: unit.moneda,
    status: unit.estado,
    country: {
      id: unit.paises.id,
      name: unit.paises.nombre,
      isoCode: unit.paises.codigo_iso,
    },
  };
}

function unitNotFound(): AppError {
  return new AppError(
    "NOT_FOUND",
    "La unidad de negocio no existe.",
    404,
  );
}

export class BusinessUnitService {
  constructor(
    private readonly repository = new BusinessUnitRepository(),
  ) {}

  async listActive(): Promise<BusinessUnitOption[]> {
    const units = await this.repository.listActive();

    return units.map((unit) => ({
      id: unit.id,
      name: unit.nombre,
      currency: unit.moneda,
      country: {
        id: unit.paises.id,
        name: unit.paises.nombre,
        isoCode: unit.paises.codigo_iso,
      },
    }));
  }

  async list(): Promise<BusinessUnitSummary[]> {
    const units = await this.repository.list();

    return units.map(mapBusinessUnit);
  }

  async create(
    input: CreateBusinessUnitInput,
    actorId: string,
  ): Promise<BusinessUnitSummary> {
    await this.assertActiveCountry(input.countryId);
    const duplicate = await this.repository.findDuplicate(
      input.name,
      input.countryId,
    );

    if (duplicate) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe una unidad con este nombre en el país seleccionado.",
        400,
      );
    }

    const unit = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new BusinessUnitRepository(transaction);
        const created = await repository.create({
          nombre: input.name,
          pais_id: input.countryId,
          moneda: input.currency,
          estado: "activo",
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "crear",
          entidad: "unidades_negocio",
          entidad_id: created.id,
          resultado: "exitoso",
          detalles: {
            pais_id: input.countryId,
            moneda: input.currency,
          },
        });

        return created;
      },
    );

    return mapBusinessUnit(unit);
  }

  async update(
    unitId: string,
    input: UpdateBusinessUnitInput,
    actorId: string,
  ): Promise<BusinessUnitSummary> {
    const existing = await this.repository.findById(unitId);

    if (!existing) {
      throw unitNotFound();
    }

    const countryId = input.countryId ?? existing.paises.id;
    const name = input.name ?? existing.nombre;

    await this.assertActiveCountry(countryId);
    const duplicate = await this.repository.findDuplicate(name, countryId);

    if (duplicate && duplicate.id !== unitId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe una unidad con este nombre en el país seleccionado.",
        400,
      );
    }

    const unit = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new BusinessUnitRepository(transaction);
        const updated = await repository.update(unitId, {
          nombre: input.name,
          pais_id: input.countryId,
          moneda: input.currency,
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "actualizar",
          entidad: "unidades_negocio",
          entidad_id: unitId,
          resultado: "exitoso",
          detalles: {},
        });

        return updated;
      },
    );

    return mapBusinessUnit(unit);
  }

  async deactivate(unitId: string, actorId: string): Promise<void> {
    const existing = await this.repository.findById(unitId);

    if (!existing) {
      throw unitNotFound();
    }

    if (existing.estado === "inactivo") {
      return;
    }

    await withAuditContext(actorId, async (transaction) => {
      const repository = new BusinessUnitRepository(transaction);
      await repository.update(unitId, { estado: "inactivo" });
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "desactivar",
        entidad: "unidades_negocio",
        entidad_id: unitId,
        resultado: "exitoso",
        detalles: {},
      });
    });
  }

  private async assertActiveCountry(countryId: string): Promise<void> {
    const country = await this.repository.findActiveCountry(countryId);

    if (!country) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El país no existe o está inactivo.",
        400,
      );
    }
  }
}
