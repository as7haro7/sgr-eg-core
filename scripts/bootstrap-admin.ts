import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";

import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

import { PasswordHasher } from "../modules/auth/services/password-hasher.service.ts";

const inputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  email: z
    .string()
    .trim()
    .email("El correo no es válido.")
    .transform((value) => value.toLowerCase()),
});

function readArgument(name: string): string | undefined {
  const position = process.argv.indexOf(`--${name}`);

  return position >= 0 ? process.argv[position + 1] : undefined;
}

function readHidden(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) {
    throw new Error("La contraseña debe ingresarse desde una terminal TTY.");
  }

  return new Promise((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Operación cancelada."));
          return;
        }

        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }

        if (character >= " ") {
          value += character;
          stdout.write("*");
        }
      }
    };

    stdout.write(label);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

function getConnectionString(): string {
  const connectionString = process.env.DIRECT_URL;

  if (!connectionString) {
    throw new Error("DIRECT_URL no está configurada.");
  }

  const url = new URL(connectionString);

  if (!url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    console.info(
      'Uso: npm run bootstrap:admin -- --name "Nombre" --email "correo@dominio.com"',
    );
    return;
  }

  const input = inputSchema.parse({
    name: readArgument("name"),
    email: readArgument("email"),
  });
  const adapter = await new PrismaPg({
    connectionString: getConnectionString(),
  }).connect();
  const pool = adapter.underlyingDriver();
  const client = await pool.connect();

  try {
    const existingUser = await client.query<{
      id: string;
      is_admin: boolean;
    }>(
      `
        SELECT
          u.id,
          EXISTS (
            SELECT 1
            FROM usuario_roles ur
            JOIN roles r ON r.id = ur.rol_id
            WHERE ur.usuario_id = u.id
              AND r.nombre = 'administrador'
              AND r.estado = 'activo'
          ) AS is_admin
        FROM usuarios u
        WHERE u.correo = $1
          AND u.deleted_at IS NULL
      `,
      [input.email],
    );

    if (existingUser.rowCount) {
      const status = existingUser.rows[0].is_admin
        ? "ya existe y ya es administrador"
        : "ya existe, pero no tiene el rol administrador";
      throw new Error(`El usuario ${input.email} ${status}.`);
    }

    const role = await client.query<{ id: string }>(
      `
        SELECT id
        FROM roles
        WHERE nombre = 'administrador'
          AND estado = 'activo'
      `,
    );

    if (role.rowCount !== 1) {
      throw new Error("No existe un único rol administrador activo.");
    }

    const password = await readHidden("Contraseña inicial: ");
    const confirmation = await readHidden("Confirmar contraseña: ");

    if (!password) {
      throw new Error("La contraseña no puede estar vacía.");
    }

    if (password !== confirmation) {
      throw new Error("Las contraseñas no coinciden.");
    }

    const userId = randomUUID();
    const passwordHash = await new PasswordHasher().hash(password);

    await client.query("BEGIN");

    try {
      await client.query(
        `
          INSERT INTO usuarios (
            id,
            nombre,
            correo,
            password_hash,
            estado,
            debe_cambiar_password
          )
          VALUES ($1, $2, $3, $4, 'activo', false)
        `,
        [userId, input.name, input.email, passwordHash],
      );
      await client.query(
        `
          INSERT INTO usuario_roles (usuario_id, rol_id)
          VALUES ($1, $2)
        `,
        [userId, role.rows[0].id],
      );
      await client.query(
        `
          INSERT INTO bitacora (
            accion,
            entidad,
            entidad_id,
            resultado,
            detalles
          )
          VALUES (
            'bootstrap',
            'usuarios',
            $1,
            'exitoso',
            jsonb_build_object('evento', 'primer_administrador')
          )
        `,
        [userId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    console.info(`Administrador ${input.email} creado correctamente.`);
  } finally {
    client.release();
    await adapter.dispose();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Error desconocido.";
  console.error(message);
  process.exitCode = 1;
});
