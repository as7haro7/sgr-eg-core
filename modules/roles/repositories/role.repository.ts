import { prisma } from "@/lib/prisma";

export class RoleRepository {
  listActive() {
    return prisma.roles.findMany({
      where: { estado: "activo" },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }
}
