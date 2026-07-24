import type { estado_activo } from "@/generated/prisma/client";

export interface UserRole {
  id: string;
  name: string;
}

export interface UserUnit {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  status: estado_activo;
  mustChangePassword: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  roles: UserRole[];
  units: UserUnit[];
}

export interface PaginatedUsers {
  items: UserSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
