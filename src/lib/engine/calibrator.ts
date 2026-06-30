/* ============================================================
   Adwen — Calibrator (Deterministic)
   Predicted-vs-actual calibration. Brier score + recalibration.
   ============================================================ */

import type { CalibrationResult } from '@/types/engine.types';

/**
 * Compute Brier score from predicted probabilities and actual outcomes.
 * Brier = (1/N) Σ (predicted - actual)²
 * 0 = perfect, 1 = worst possible.
 */
export function computeBrierScore(
  predictions: Array<{ predicted: number; actual: number }>
): number {
  if (predictions.length === 0) return 0;

  const sum = predictions.reduce((acc, p) => {
    return acc + (p.predicted - p.actual) ** 2;
  }, 0);

  return sum / predictions.length;
}

/**
 * Compute Expected Calibration Error (ECE).
 * Groups predictions into bins and measures how well predicted
 * probabilities match observed frequencies.
 */
export function computeECE(
  predictions: Array<{ predicted: number; actual: number }>,
  nBins: number = 10
): { ece: number; bins: CalibrationResult['reliabilityBins'] } {
  if (predictions.length === 0) {
    return { ece: 0, bins: [] };
  }

  const binWidth = 1 / nBins;
  const bins: CalibrationResult['reliabilityBins'] = [];

  for (let i = 0; i < nBins; i++) {
    const low = i * binWidth;
    const high = (i + 1) * binWidth;
    const inBin = predictions.filter(
      (p) => p.predicted >= low && p.predicted < high
    );

    if (inBin.length > 0) {
      const meanPredicted = inBin.reduce((s, p) => s + p.predicted, 0) / inBin.length;
      const meanActual = inBin.reduce((s, p) => s + p.actual, 0) / inBin.length;

      bins.push({
        binMidpoint: (low + high) / 2,
        meanPredicted,
        meanActual,
        count: inBin.length,
      });
    }
  }

  // ECE = weighted average of |meanActual - meanPredicted| per bin
  const ece = bins.reduce((acc, bin) => {
    return acc + (bin.count / predictions.length) * Math.abs(bin.meanActual - bin.meanPredicted);
  }, 0);

  return { ece, bins };
}

/**
 * Suggest item parameter adjustments based on observed performance.
 * If an item's observed difficulty differs significantly from its parameter,
 * suggest a recalibration.
 */
export function suggestParameterAdjustments(
  items: Array<{
    itemId: string;
    currentB: number;
    responses: Array<{ correct: boolean; thetaAtTime: number }>;
  }>
): CalibrationResult['parameterAdjustments'] {
  const adjustments: CalibrationResult['parameterAdjustments'] = [];

  for (const item of items) {
    if (item.responses.length < 5) continue; // Need minimum data

    // Estimate observed difficulty: theta at 50% correct
    const correctRate = item.responses.filter((r) => r.correct).length / item.responses.length;
    const avgTheta = item.responses.reduce((s, r) => s + r.thetaAtTime, 0) / item.responses.length;

    // Simple adjustment: if correct rate is much higher than expected at average theta,
    // the item is easier than its b parameter suggests
    const expectedCorrectRate = 0.25 + 0.75 / (1 + Math.exp(-1.0 * (avgTheta - item.currentB)));
    const diff = correctRate - expectedCorrectRate;

    if (Math.abs(diff) > 0.15) {
      const suggestedB = item.currentB - diff * 2; // Rough adjustment
      adjustments.push({
        itemId: item.itemId,
        currentB: item.currentB,
        suggestedB: Math.round(suggestedB * 100) / 100,
        nResponses: item.responses.length,
      });
    }
  }

  return adjustments;
}

/**
 * Full calibration analysis.
 */
export function computeCalibration(
  predictions: Array<{ predicted: number; actual: number }>,
  items: Array<{
    itemId: string;
    currentB: number;
    responses: Array<{ correct: boolean; thetaAtTime: number }>;
  }>
): CalibrationResult {
  const brierScore = computeBrierScore(predictions);
  const { ece, bins } = computeECE(predictions);
  const parameterAdjustments = suggestParameterAdjustments(items);

  return {
    brierScore: Math.round(brierScore * 1000) / 1000,
    ece: Math.round(ece * 1000) / 1000,
    reliabilityBins: bins,
    parameterAdjustments,
  };
}
