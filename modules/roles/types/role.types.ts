export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{
    moduleCode: string;
    moduleName: string;
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDeactivate: boolean;
    scope: "global" | "unidad" | "propio" | "asignado";
  }>;
}
