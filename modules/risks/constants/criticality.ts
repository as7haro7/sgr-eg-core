import type { RiskCriticality } from "@/modules/risks/types/risk.types";

export interface CriticalityRanges {
  low: readonly [number, number];
  moderate: readonly [number, number];
  high: readonly [number, number];
  critical: readonly [number, number];
}

export const defaultCriticalityRanges: CriticalityRanges = {
  low: [1, 4],
  moderate: [5, 9],
  high: [10, 16],
  critical: [17, 25],
};

function isRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item)) &&
    value[0] <= value[1]
  );
}

export function parseCriticalityRanges(value: unknown): CriticalityRanges {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return defaultCriticalityRanges;
  }
  const record = value as Record<string, unknown>;
  const moderate = record.moderate ?? record.moderado;
  const critical = record.critical ?? record.critico;
  if (
    !isRange(record.low ?? record.bajo) ||
    !isRange(moderate) ||
    !isRange(record.high ?? record.alto) ||
    !isRange(critical)
  ) {
    return defaultCriticalityRanges;
  }

  return {
    low: record.low ?? record.bajo,
    moderate,
    high: record.high ?? record.alto,
    critical,
  } as CriticalityRanges;
}

export function classifyRiskLevel(
  level: number,
  ranges: CriticalityRanges = defaultCriticalityRanges,
): RiskCriticality {
  if (level <= ranges.low[1]) return "low";
  if (level <= ranges.moderate[1]) return "moderate";
  if (level <= ranges.high[1]) return "high";
  return "critical";
}
