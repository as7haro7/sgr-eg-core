export function roundRiskValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateRiskLevels(
  probability: number,
  impact: number,
  controlEffectiveness: readonly number[],
) {
  const inherentLevel = probability * impact;
  const residualFactor = controlEffectiveness.reduce(
    (factor, effectiveness) => factor * (1 - effectiveness / 100),
    1,
  );
  return {
    inherentLevel,
    residualLevel: roundRiskValue(inherentLevel * residualFactor),
    accumulatedEffectiveness: roundRiskValue((1 - residualFactor) * 100),
  };
}
