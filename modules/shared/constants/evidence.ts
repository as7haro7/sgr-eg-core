export const evidenceEntityTypes = [
  "risk",
  "control",
  "plan",
  "action",
  "audit",
  "finding",
  "evaluation",
] as const;

export type EvidenceEntityType = (typeof evidenceEntityTypes)[number];

export const defaultEvidenceMaxBytes = 10 * 1024 * 1024;

export const blockedEvidenceMimeTypes = [
  "application/x-msdownload",
  "application/x-executable",
  "application/x-dosexec",
  "application/x-sh",
] as const;

export const allowedEvidenceMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
] as const;

export const blockedEvidenceExtensions = [
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "ps1",
  "sh",
  "scr",
  "jar",
] as const;
