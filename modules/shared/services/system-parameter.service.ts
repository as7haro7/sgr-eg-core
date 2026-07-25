import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { SystemParameterRepository } from "@/modules/shared/repositories/system-parameter.repository";
import type { SystemParameterSummary } from "@/modules/shared/types/system-parameter.types";
import type {
  CreateSystemParameterInput,
  UpdateSystemParameterInput,
} from "@/modules/shared/validators/system-parameter.validator";

type ParameterRecord = NonNullable<
  Awaited<ReturnType<SystemParameterRepository["findByKey"]>>
>;

function mapParameter(
  parameter: ParameterRecord,
): SystemParameterSummary {
  return {
    key: parameter.clave,
    value: parameter.valor,
    description: parameter.descripcion,
    updatedAt: parameter.updated_at,
  };
}

function toPrismaJson(
  value: CreateSystemParameterInput["value"],
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

const knownParameterSchemas: Record<string, z.ZodType> = {
  evidencia_max_bytes: z.number().int().min(1).max(50 * 1024 * 1024),
  alerta_dias_vencimiento: z.number().int().min(0).max(365),
  sesion_minutos: z.number().int().min(5).max(1_440),
  criticidad_rangos: z.object({
    bajo: z.tuple([z.number().min(1), z.number().max(25)]),
    moderado: z.tuple([z.number().min(1), z.number().max(25)]),
    alto: z.tuple([z.number().min(1), z.number().max(25)]),
    critico: z.tuple([z.number().min(1), z.number().max(25)]),
  }),
};

function assertValidParameterValue(key: string, value: unknown): void {
  const schema = knownParameterSchemas[key];

  if (schema && !schema.safeParse(value).success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `El valor de ${key} no tiene el tipo o rango esperado.`,
      400,
    );
  }
}

export class SystemParameterService {
  constructor(
    private readonly repository = new SystemParameterRepository(),
  ) {}

  async list(): Promise<SystemParameterSummary[]> {
    const parameters = await this.repository.list();

    return parameters.map(mapParameter);
  }

  async create(
    input: CreateSystemParameterInput,
    actorId: string,
  ): Promise<SystemParameterSummary> {
    assertValidParameterValue(input.key, input.value);
    const existing = await this.repository.findByKey(input.key);

    if (existing) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Ya existe un parámetro con la misma clave.",
        400,
      );
    }

    const parameter = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new SystemParameterRepository(transaction);
        const created = await repository.create({
          clave: input.key,
          valor: toPrismaJson(input.value),
          descripcion: input.description,
          actualizado_por: actorId,
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "crear",
          entidad: "parametros_sistema",
          resultado: "exitoso",
          detalles: { clave: input.key },
        });

        return created;
      },
    );

    return mapParameter(parameter);
  }

  async update(
    key: string,
    input: UpdateSystemParameterInput,
    actorId: string,
  ): Promise<SystemParameterSummary> {
    const existing = await this.repository.findByKey(key);

    if (!existing) {
      throw new AppError(
        "NOT_FOUND",
        "El parámetro no existe.",
        404,
      );
    }

    if (input.value !== undefined) {
      assertValidParameterValue(key, input.value);
    }

    const parameter = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new SystemParameterRepository(transaction);
        const updated = await repository.update(key, {
          valor:
            input.value === undefined
              ? undefined
              : toPrismaJson(input.value),
          descripcion: input.description,
          actualizado_por: actorId,
          updated_at: new Date(),
        });
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "actualizar",
          entidad: "parametros_sistema",
          resultado: "exitoso",
          detalles: { clave: key },
        });

        return updated;
      },
    );

    return mapParameter(parameter);
  }
}
