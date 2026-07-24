import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { CountryRepository } from "@/modules/business-units/repositories/country.repository";
import type { CountrySummary } from "@/modules/business-units/types/business-unit.types";
import type {
  CreateCountryInput,
  UpdateCountryInput,
} from "@/modules/business-units/validators/organization.validator";

type CountryRecord = Awaited<
  ReturnType<CountryRepository["findById"]>
>;

function mapCountry(
  country: NonNullable<CountryRecord>,
): CountrySummary {
  return {
    id: country.id,
    name: country.nombre,
    isoCode: country.codigo_iso,
    status: country.estado,
  };
}

function countryNotFound(): AppError {
  return new AppError("NOT_FOUND", "El país no existe.", 404);
}

export class CountryService {
  constructor(private readonly repository = new CountryRepository()) {}

  async list(): Promise<CountrySummary[]> {
    const countries = await this.repository.list();

    return countries.map(mapCountry);
  }

  async create(
    input: CreateCountryInput,
    actorId: string,
  ): Promise<CountrySummary> {
    const duplicate = await this.repository.findDuplicate(
      input.name,
      input.isoCode,
    );

    if (duplicate) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe un país con el mismo nombre o código ISO.",
        400,
      );
    }

    const country = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new CountryRepository(transaction);
        const created = await repository.create({
          nombre: input.name,
          codigo_iso: input.isoCode,
          estado: "activo",
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "crear",
          entidad: "paises",
          entidad_id: created.id,
          resultado: "exitoso",
          detalles: {
            codigo_iso: input.isoCode,
          },
        });

        return created;
      },
    );

    return mapCountry(country);
  }

  async update(
    countryId: string,
    input: UpdateCountryInput,
    actorId: string,
  ): Promise<CountrySummary> {
    const existing = await this.repository.findById(countryId);

    if (!existing) {
      throw countryNotFound();
    }

    const nextName = input.name ?? existing.nombre;
    const nextIsoCode = input.isoCode ?? existing.codigo_iso;
    const duplicate = await this.repository.findDuplicate(
      nextName,
      nextIsoCode,
    );

    if (duplicate && duplicate.id !== countryId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe un país con el mismo nombre o código ISO.",
        400,
      );
    }

    const country = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new CountryRepository(transaction);
        const updated = await repository.update(countryId, {
          nombre: input.name,
          codigo_iso: input.isoCode,
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "actualizar",
          entidad: "paises",
          entidad_id: countryId,
          resultado: "exitoso",
          detalles: {},
        });

        return updated;
      },
    );

    return mapCountry(country);
  }

  async deactivate(countryId: string, actorId: string): Promise<void> {
    const existing = await this.repository.findById(countryId);

    if (!existing) {
      throw countryNotFound();
    }

    if (existing.estado === "inactivo") {
      return;
    }

    const activeUnits = await this.repository.countActiveUnits(countryId);

    if (activeUnits > 0) {
      throw new AppError(
        "VALIDATION_ERROR",
        "No se puede desactivar un país con unidades activas.",
        400,
      );
    }

    await withAuditContext(actorId, async (transaction) => {
      const repository = new CountryRepository(transaction);
      await repository.update(countryId, { estado: "inactivo" });
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "desactivar",
        entidad: "paises",
        entidad_id: countryId,
        resultado: "exitoso",
        detalles: {},
      });
    });
  }
}
