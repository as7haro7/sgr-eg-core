import { RoleRepository } from "@/modules/roles/repositories/role.repository";
import type { RoleOption } from "@/modules/roles/types/role.types";

export class RoleService {
  constructor(private readonly repository = new RoleRepository()) {}

  async listActive(): Promise<RoleOption[]> {
    const roles = await this.repository.listActive();

    return roles.map((role) => ({
      id: role.id,
      name: role.nombre,
      description: role.descripcion,
    }));
  }
}
