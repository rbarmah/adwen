/* ============================================================
   Adwen — Readiness Model (Deterministic)
   Computes readiness range from skill masteries, emphasis, and coverage.
   Output is ALWAYS a range with CI — never a bare number.
   ============================================================ */

import type { ReadinessInput, ReadinessResult } from '@/types/engine.types';

/**
 * Compute readiness as a weighted combination of skill masteries,
 * scaled by topic coverage and observation count.
 *
 * Output: point + credible interval + confidence label + basis.
 * The CI TIGHTENS with more observations — this is the moat.
 */
export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { skillMasteries, cognitiveEmphasis, topicCoverage, totalObservations } = input;

  // Normalize emphasis weights across all 6 dimensions
  const ce = cognitiveEmphasis as any;
  const totalWeight = Object.values(ce).reduce<number>((sum, v) => sum + (Number(v) || 0), 0);

  const safeTotal = totalWeight > 0 ? totalWeight : 100;
  const normWeights: Record<string, number> = {};
  for (const [k, v] of Object.entries(ce)) {
    normWeights[k] = (v as number) / safeTotal;
  }

  // Weighted skill score
  const skillBreakdown: ReadinessResult['skillBreakdown'] = {};
  let weightedSum = 0;

  for (const [skill, mastery] of Object.entries(skillMasteries)) {
    const weight = normWeights[skill as keyof typeof normWeights] ?? 0;
    const masteryVal = mastery as number;
    const contribution = masteryVal * weight;
    weightedSum += contribution;
    skillBreakdown[skill] = { mastery: masteryVal, weight, contribution };
  }

  // Scale by topic coverage
  const rawPoint = weightedSum * topicCoverage * 100;
  const point = Math.max(0, Math.min(100, rawPoint));

  // CI width is inverse to sqrt of observations (Bayesian shrinkage)
  // At cold-start (0 obs): CI = ±35 points
  // At 20 obs: CI = ±~8 points
  // At 100 obs: CI = ±~3.5 points
  const baseUncertainty = 35;
  const halfWidth = baseUncertainty / Math.sqrt(Math.max(1, totalObservations));

  const ciLow = Math.max(0, point - halfWidth);
  const ciHigh = Math.min(100, point + halfWidth);

  // Confidence label from observation count
  const confidenceLabel = getConfidenceLabel(totalObservations);

  // Basis statement
  const basis = generateBasis(totalObservations, Object.keys(skillMasteries).length, topicCoverage);

  return {
    point,
    ciLow,
    ciHigh,
    confidenceLabel,
    basis,
    skillBreakdown,
  };
}

/**
 * Map observation count to confidence label.
 */
function getConfidenceLabel(nObs: number): ReadinessResult['confidenceLabel'] {
  if (nObs === 0) return 'very_low';
  if (nObs < 8) return 'low';
  if (nObs < 20) return 'moderate';
  if (nObs < 50) return 'high';
  return 'very_high';
}

/**
 * Generate a human-readable basis statement.
 */
function generateBasis(nObs: number, nSkills: number, coverage: number): string {
  if (nObs === 0) {
    return 'Based on your profile alone — no quiz data yet. This range will tighten as you practice.';
  }

  const coveragePercent = Math.round(coverage * 100);
  const parts: string[] = [];

  parts.push(`Based on ${nObs} response${nObs > 1 ? 's' : ''}`);
  parts.push(`across ${nSkills} skill area${nSkills > 1 ? 's' : ''}`);

  if (coveragePercent < 50) {
    parts.push(`covering ${coveragePercent}% of exam topics — many topics not yet assessed`);
  } else if (coveragePercent < 80) {
    parts.push(`covering ${coveragePercent}% of exam topics`);
  } else {
    parts.push(`with good coverage (${coveragePercent}%) of exam topics`);
  }

  return parts.join(', ') + '.';
}

/**
 * Compute cold-start readiness from profile alone (no quiz data).
 * Uses learner constructs + self-rated difficulty.
 */
export function computeColdStartReadiness(
  constructValues: Record<string, number>,
  selfDifficulty: number
): ReadinessResult {
  // Normalize construct values from 0–100 scale to 0–1 probability scale.
  // learner_constructs.value is stored as 0–100; readiness engine works in 0–1.
  const values = Object.values(constructValues).map(v => Math.max(0, Math.min(100, v)) / 100);
  const avgConstruct = values.length > 0
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0.5;

  // Invert difficulty: 5 is neutral (1.0 factor). 1 gives +20%, 10 gives -25%
  // This keeps the baseline contiguous with post-quiz readiness
  const difficultyFactor = 1.0 + (5 - selfDifficulty) * 0.05;

  const point = avgConstruct * difficultyFactor * 100;

  return {
    point: Math.max(5, Math.min(95, point)),
    ciLow: Math.max(0, point - 35),
    ciHigh: Math.min(100, point + 35),
    confidenceLabel: 'very_low',
    basis: 'Based on your profile and self-rated difficulty only — no quiz data yet. Complete a quiz to get a much more accurate estimate.',
    skillBreakdown: {},
  };
}
