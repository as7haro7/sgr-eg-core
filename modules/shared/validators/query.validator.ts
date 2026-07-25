import { z } from "zod";

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === ""
    ? undefined
    : value;
}

export const queryPageSchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().int().positive().default(1),
);

export const queryPageSizeSchema = z.preprocess(
  emptyStringToUndefined,
  z.coerce.number().int().min(1).max(100).default(20),
);

export const optionalQueryText = (maximum = 200) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(maximum).optional(),
  );

export const optionalQueryUuid = z.preprocess(
  emptyStringToUndefined,
  z.string().uuid().optional(),
);

export const optionalQueryEnum = <
  const T extends readonly [string, ...string[]],
>(
  values: T,
) => z.preprocess(emptyStringToUndefined, z.enum(values).optional());

export const optionalQueryDate = (endOfDay = false) =>
  z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .date("La fecha no es válida.")
      .transform(
        (value) =>
          new Date(
            `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
          ),
      )
      .optional(),
  );

export function parsePageQuery<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  return result.success ? result.data : schema.parse({});
}
