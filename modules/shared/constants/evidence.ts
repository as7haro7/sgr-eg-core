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
