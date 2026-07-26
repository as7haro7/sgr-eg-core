import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "openapi.yaml"), "utf8");
const routeRoot = join(process.cwd(), "app", "api");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? routeFiles(path)
      : entry.name === "route.ts"
        ? [path]
        : [];
  });
}

function openApiPath(file: string): string {
  return `/${relative(routeRoot, file)
    .split(sep)
    .slice(0, -1)
    .map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}"))
    .join("/")}`;
}

describe("Contrato OpenAPI", () => {
  it("documenta todas las rutas implementadas", () => {
    const missing = routeFiles(routeRoot)
      .map(openApiPath)
      .filter((path) => !source.includes(`  ${path}:`));
    expect(missing).toEqual([]);
  });

  it("documenta errores 4xx en todas las operaciones", () => {
    const operations = source.split(/\n(?=    (?:get|post|put|patch|delete):)/);
    const undocumented = operations
      .filter((block) => /^    (?:get|post|put|patch|delete):/.test(block))
      .filter((block) => !/        "4\d\d":/.test(block));
    expect(undocumented).toEqual([]);
  });

  it("declara cuerpos JSON y multipart", () => {
    expect(source).toContain("    JsonBody:");
    expect(source).toContain('$ref: "#/components/requestBodies/JsonBody"');
    expect(source).toContain("multipart/form-data:");
  });
});
