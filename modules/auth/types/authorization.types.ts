export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "deactivate";

export interface AuthorizationContext {
  unitId?: string;
  ownerId?: string;
  assigneeIds?: string[];
}
