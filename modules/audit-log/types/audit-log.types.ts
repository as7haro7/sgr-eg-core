import type { Prisma } from "@/generated/prisma/client";

export interface AuditLogEntry {
  id: string; // BIGINT is mapped to string for JSON serialization
  user: { id: string; name: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  result: string;
  details: Prisma.JsonValue;
  ip: string | null;
  timestamp: Date;
}

export interface PaginatedAuditLog {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
