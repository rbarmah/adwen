/* ============================================================
   Adwen — IRT 3PL Engine (Deterministic)
   This is MATH, not an LLM call.
   ============================================================ */

import type { IRTItemParams, IRTResponse, ThetaEstimate } from '@/types/engine.types';
import type { CognitiveType } from '@/types/database.types';

/** Number of quadrature points for EAP estimation */
const N_QUAD = 49;
/** Range of theta for quadrature */
const THETA_MIN = -4;
const THETA_MAX = 4;

/**
 * 3PL probability of correct response.
 * P(θ) = c + (1-c) / (1 + exp(-a(θ-b)))
 */
export function probability3PL(theta: number, params: IRTItemParams): number {
  const { a, b, c } = params;
  const exponent = -a * (theta - b);
  return c + (1 - c) / (1 + Math.exp(exponent));
}

/**
 * Fisher information for a 3PL item at a given theta.
 * Used for adaptive item selection (CAT).
 */
export function fisherInformation(theta: number, params: IRTItemParams): number {
  const { a, b, c } = params;
  const p = probability3PL(theta, params);
  const q = 1 - p;

  if (p <= c || p >= 1 || q <= 0) return 0;

  const pStar = 1 / (1 + Math.exp(-a * (theta - b)));
  const numerator = a * a * pStar * pStar * q;
  const denominator = p;

  return numerator / denominator;
}

/**
 * Normal prior density for EAP estimation.
 * N(0, 1) by default.
 */
function normalPrior(theta: number, mean: number = 0, sd: number = 1): number {
  const z = (theta - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/**
 * EAP (Expected A Posteriori) estimation of theta.
 * Numerically integrates over quadrature points.
 *
 * This is the core measurement — 100% deterministic, never an LLM.
 */
export function estimateTheta(
  responses: IRTResponse[],
  priorMean: number = 0,
  priorSd: number = 1
): ThetaEstimate {
  if (responses.length === 0) {
    return { theta: priorMean, se: priorSd, nResponses: 0 };
  }

  const step = (THETA_MAX - THETA_MIN) / (N_QUAD - 1);
  const quadPoints: number[] = [];
  for (let i = 0; i < N_QUAD; i++) {
    quadPoints.push(THETA_MIN + i * step);
  }

  // Compute posterior at each quadrature point
  const posteriors: number[] = new Array(N_QUAD);
  let totalPosterior = 0;

  for (let j = 0; j < N_QUAD; j++) {
    const theta = quadPoints[j];

    // Log-likelihood to avoid underflow
    let logLikelihood = 0;
    for (const resp of responses) {
      const p = probability3PL(theta, resp.itemParams);
      const pClamped = Math.max(1e-10, Math.min(1 - 1e-10, p));
      logLikelihood += resp.correct
        ? Math.log(pClamped)
        : Math.log(1 - pClamped);
    }

    const prior = normalPrior(theta, priorMean, priorSd);
    posteriors[j] = Math.exp(logLikelihood) * prior;
    totalPosterior += posteriors[j];
  }

  // Normalize and compute EAP
  if (totalPosterior === 0) {
    return { theta: priorMean, se: priorSd, nResponses: responses.length };
  }

  let thetaEAP = 0;
  let thetaVariance = 0;

  for (let j = 0; j < N_QUAD; j++) {
    const weight = posteriors[j] / totalPosterior;
    thetaEAP += quadPoints[j] * weight;
  }

  for (let j = 0; j < N_QUAD; j++) {
    const weight = posteriors[j] / totalPosterior;
    thetaVariance += (quadPoints[j] - thetaEAP) ** 2 * weight;
  }

  return {
    theta: thetaEAP,
    se: Math.sqrt(thetaVariance),
    nResponses: responses.length,
  };
}

/**
 * Compute standard error of theta estimate.
 * Based on the test information function.
 */
export function computeSE(
  theta: number,
  items: IRTItemParams[],
  responses: boolean[]
): number {
  let totalInfo = 0;
  for (let i = 0; i < items.length; i++) {
    if (i < responses.length) {
      totalInfo += fisherInformation(theta, items[i]);
    }
  }

  if (totalInfo <= 0) return 4; // Maximum uncertainty
  return 1 / Math.sqrt(totalInfo);
}

/**
 * Estimate theta separately for each cognitive dimension.
 */
export function estimateMultidimensionalTheta(
  responses: Array<IRTResponse & { cognitiveType: CognitiveType }>,
  priorMean: number = 0,
  priorSd: number = 1
): Record<CognitiveType, ThetaEstimate> {
  const dimensions: CognitiveType[] = ['recall', 'comprehension', 'application', 'analysis', 'evaluation', 'synthesis', 'maths', 'procedural', 'data_interpretation'];
  const result = {} as Record<CognitiveType, ThetaEstimate>;

  for (const dim of dimensions) {
    const dimResponses = responses.filter(r => r.cognitiveType === dim);
    result[dim] = estimateTheta(dimResponses, priorMean, priorSd);
  }

  return result;
}
