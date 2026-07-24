import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { RiskConfigurationRepository } from "@/modules/risks/repositories/risk-configuration.repository";
import type {
  RiskAppetiteSummary,
  RiskCategorySummary,
} from "@/modules/risks/types/risk-configuration.types";
import type {
  CreateRiskAppetiteInput,
  CreateRiskCategoryInput,
  UpdateRiskCategoryInput,
} from "@/modules/risks/validators/risk-configuration.validator";

type CategoryRecord = NonNullable<
  Awaited<
    ReturnType<RiskConfigurationRepository["findCategoryById"]>
  >
>;
type AppetiteRecord = Awaited<
  ReturnType<RiskConfigurationRepository["createAppetite"]>
>;

function mapCategory(category: CategoryRecord): RiskCategorySummary {
  return {
    id: category.id,
    name: category.nombre,
    description: category.descripcion,
    baseAppetite: category.apetito_base.toNumber(),
    status: category.estado,
  };
}

function mapAppetite(appetite: AppetiteRecord): RiskAppetiteSummary {
  return {
    id: appetite.id,
    category: {
      id: appetite.categorias_riesgo.id,
      name: appetite.categorias_riesgo.nombre,
    },
    unit: appetite.unidades_negocio
      ? {
          id: appetite.unidades_negocio.id,
          name: appetite.unidades_negocio.nombre,
        }
      : null,
    threshold: appetite.umbral.toNumber(),
    validFrom: appetite.vigente_desde,
    validUntil: appetite.vigente_hasta,
  };
}

function categoryNotFound(): AppError {
  return new AppError("NOT_FOUND", "La categoría no existe.", 404);
}

export class RiskConfigurationService {
  constructor(
    private readonly repository = new RiskConfigurationRepository(),
  ) {}

  async listCategories(): Promise<RiskCategorySummary[]> {
    const categories = await this.repository.listCategories();

    return categories.map(mapCategory);
  }

  async createCategory(
    input: CreateRiskCategoryInput,
    actorId: string,
  ): Promise<RiskCategorySummary> {
    const duplicate = await this.repository.findCategoryByName(input.name);

    if (duplicate) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe una categoría con el mismo nombre.",
        400,
      );
    }

    const category = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new RiskConfigurationRepository(transaction);
        const created = await repository.createCategory({
          nombre: input.name,
          descripcion: input.description,
          apetito_base: input.baseAppetite,
          estado: "activo",
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "crear",
          entidad: "categorias_riesgo",
          entidad_id: created.id,
          resultado: "exitoso",
          detalles: { apetito_base: input.baseAppetite },
        });

        return created;
      },
    );

    return mapCategory(category);
  }

  async updateCategory(
    categoryId: string,
    input: UpdateRiskCategoryInput,
    actorId: string,
  ): Promise<RiskCategorySummary> {
    const existing = await this.repository.findCategoryById(categoryId);

    if (!existing) {
      throw categoryNotFound();
    }

    if (input.name && input.name !== existing.nombre) {
      const duplicate = await this.repository.findCategoryByName(input.name);

      if (duplicate) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Ya existe una categoría con el mismo nombre.",
          400,
        );
      }
    }

    const category = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new RiskConfigurationRepository(transaction);
        const updated = await repository.updateCategory(categoryId, {
          nombre: input.name,
          descripcion: input.description,
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "actualizar",
          entidad: "categorias_riesgo",
          entidad_id: categoryId,
          resultado: "exitoso",
          detalles: {},
        });

        return updated;
      },
    );

    return mapCategory(category);
  }

  async deactivateCategory(
    categoryId: string,
    actorId: string,
  ): Promise<void> {
    const existing = await this.repository.findCategoryById(categoryId);

    if (!existing) {
      throw categoryNotFound();
    }

    if (existing.estado === "inactivo") {
      return;
    }

    await withAuditContext(actorId, async (transaction) => {
      const repository = new RiskConfigurationRepository(transaction);
      await repository.updateCategory(categoryId, { estado: "inactivo" });
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "desactivar",
        entidad: "categorias_riesgo",
        entidad_id: categoryId,
        resultado: "exitoso",
        detalles: {},
      });
    });
  }

  async listAppetites(): Promise<RiskAppetiteSummary[]> {
    const appetites = await this.repository.listAppetites();

    return appetites.map(mapAppetite);
  }

  async createAppetite(
    input: CreateRiskAppetiteInput,
    actorId: string,
  ): Promise<RiskAppetiteSummary> {
    const category = await this.repository.findCategoryById(input.categoryId);

    if (!category || category.estado !== "activo") {
      throw new AppError(
        "VALIDATION_ERROR",
        "La categoría debe existir y estar activa.",
        400,
      );
    }

    if (input.unitId) {
      const unit = await this.repository.findActiveUnitById(input.unitId);

      if (!unit) {
        throw new AppError(
          "VALIDATION_ERROR",
          "La unidad de negocio debe existir y estar activa.",
          400,
        );
      }
    }

    const duplicate = await this.repository.findAppetiteByStartDate(
      input.categoryId,
      input.unitId,
      input.validFrom,
    );

    if (duplicate) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe una configuración para la misma categoría, unidad y fecha inicial.",
        400,
      );
    }

    const appetite = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new RiskConfigurationRepository(transaction);
        const created = await repository.createAppetite({
          categoria_id: input.categoryId,
          unidad_id: input.unitId,
          umbral: input.threshold,
          vigente_desde: input.validFrom,
          vigente_hasta: input.validUntil,
          creado_por: actorId,
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "crear",
          entidad: "apetitos_riesgo",
          entidad_id: created.id,
          resultado: "exitoso",
          detalles: {
            categoria_id: input.categoryId,
            unidad_id: input.unitId,
            umbral: input.threshold,
          },
        });

        return created;
      },
    );

    return mapAppetite(appetite);
  }
}
