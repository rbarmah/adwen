/* ============================================================
   Adwen — Bayesian Knowledge Tracing (Deterministic)
   Per-skill mastery tracking using a Hidden Markov Model.
   ============================================================ */

import type { BKTParams, BKTState } from '@/types/engine.types';

/**
 * Default BKT parameters (conservative estimates).
 * Will be calibrated from real data in Phase 3.
 */
export const DEFAULT_BKT: BKTParams = {
  pInit: 0.1,
  pLearn: 0.15,
  pSlip: 0.05,
  pGuess: 0.25,
};

/**
 * Update mastery probability given a response.
 *
 * Uses the standard BKT update equations:
 * 1. P(L_t | correct) = P(L_t) * (1 - P(slip)) / P(correct)
 * 2. P(L_t | wrong)   = P(L_t) * P(slip) / P(wrong)
 * 3. P(L_{t+1})       = P(L_t | obs) + (1 - P(L_t | obs)) * P(learn)
 */
export function updateMastery(
  currentMastery: number,
  isCorrect: boolean,
  params: BKTParams = DEFAULT_BKT
): number {
  const { pSlip, pGuess, pLearn } = params;
  const pL = currentMastery;

  // Step 1: Posterior given observation
  let pLGivenObs: number;

  if (isCorrect) {
    // P(correct) = P(L) * (1 - P(slip)) + (1 - P(L)) * P(guess)
    const pCorrect = pL * (1 - pSlip) + (1 - pL) * pGuess;
    pLGivenObs = (pL * (1 - pSlip)) / pCorrect;
  } else {
    // P(wrong) = P(L) * P(slip) + (1 - P(L)) * (1 - P(guess))
    const pWrong = pL * pSlip + (1 - pL) * (1 - pGuess);
    pLGivenObs = (pL * pSlip) / pWrong;
  }

  // Step 2: Learning transition
  const pLNext = pLGivenObs + (1 - pLGivenObs) * pLearn;

  return Math.max(0, Math.min(1, pLNext));
}

/**
 * Predict when mastery will decay below a threshold.
 * Simple exponential decay model based on time since last practice.
 */
export function predictForgetTime(
  currentMastery: number,
  lastSeen: Date,
  decayRate: number = 0.05,
  threshold: number = 0.5
): Date | null {
  if (currentMastery <= threshold) return null;

  // Time (in hours) until mastery decays to threshold
  // mastery(t) = mastery_0 * exp(-decayRate * t)
  // threshold = mastery_0 * exp(-decayRate * t)
  // t = -ln(threshold / mastery_0) / decayRate
  const hoursUntilForget = -Math.log(threshold / currentMastery) / decayRate;

  const forgetAt = new Date(lastSeen.getTime() + hoursUntilForget * 3600 * 1000);
  return forgetAt;
}

/**
 * Apply time-based decay to mastery.
 */
export function applyDecay(
  currentMastery: number,
  lastSeen: Date,
  now: Date = new Date(),
  decayRate: number = 0.05
): number {
  const hoursElapsed = (now.getTime() - lastSeen.getTime()) / (3600 * 1000);
  if (hoursElapsed <= 0) return currentMastery;

  const decayed = currentMastery * Math.exp(-decayRate * hoursElapsed);
  return Math.max(0, decayed);
}

/**
 * Initialize a BKT state for a new skill.
 */
export function initBKTState(
  params: BKTParams = DEFAULT_BKT
): BKTState {
  return {
    pMastered: params.pInit,
    nObs: 0,
    lastSeen: new Date(),
    predictedForgetAt: null,
  };
}

/**
 * Propagate BKT mastery states along prerequisite dependencies.
 * - Caps dependent topics if any of their prerequisites are below 0.40.
 * - Gives a 10% booster (up to max 0.98) to a dependent topic if all of its prerequisites exceed 0.80.
 */
export function propagatePrerequisites(
  masteryMap: Record<string, number>, // topic -> pMastered
  prerequisites: Array<{ from_topic: string; to_topic: string }>
): Record<string, number> {
  const updated = { ...masteryMap };

  // Group prerequisites by target topic
  const targetToPrereqs: Record<string, string[]> = {};
  for (const p of prerequisites) {
    if (!targetToPrereqs[p.to_topic]) {
      targetToPrereqs[p.to_topic] = [];
    }
    targetToPrereqs[p.to_topic].push(p.from_topic);
  }

  for (const [topic, prereqTopics] of Object.entries(targetToPrereqs)) {
    if (!(topic in updated)) continue;

    // Check if any prerequisite has very low mastery
    const hasLowPrereq = prereqTopics.some(p => (updated[p] ?? 0.35) < 0.40);
    // Check if all prerequisites have high mastery
    const allHighPrereq = prereqTopics.every(p => (updated[p] ?? 0.35) >= 0.80);

    if (hasLowPrereq) {
      // Cap the dependent topic's mastery at 0.40
      updated[topic] = Math.min(updated[topic], 0.40);
    } else if (allHighPrereq && prereqTopics.length > 0) {
      // Boost the dependent topic's mastery by 10% (max 0.98)
      updated[topic] = Math.min(0.98, updated[topic] + 0.10);
    }
  }

  return updated;
}
