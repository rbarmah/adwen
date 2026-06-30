/* ============================================================
   Adwen — Engine Type Definitions
   Deterministic measurement engine interfaces
   ============================================================ */

/** IRT 3PL item parameters */
export interface IRTItemParams {
  /** Discrimination (slope) — typically 0.5–2.5 */
  a: number;
  /** Difficulty (location) — typically -3 to 3 */
  b: number;
  /** Guessing (lower asymptote) — typically 0.15–0.35 for 4-option MCQ */
  c: number;
}

/** A single response for IRT estimation */
export interface IRTResponse {
  itemParams: IRTItemParams;
  correct: boolean;
}

/** Result of theta estimation */
export interface ThetaEstimate {
  /** Point estimate of ability */
  theta: number;
  /** Standard error of theta */
  se: number;
  /** Number of responses used */
  nResponses: number;
}

/** CAT constraints for item selection */
export interface CATConstraints {
  /** Topic coverage targets: { topicName: targetProportion } */
  topicTargets?: Record<string, number>;
  /** Cognitive type balance: { type: targetProportion } */
  cognitiveTypeTargets?: Record<string, number>;
  /** Current session counts of topics administered */
  topicCounts?: Record<string, number>;
  /** Current session counts of cognitive types administered */
  cognitiveTypeCounts?: Record<string, number>;
  /** Maximum exposure rate per item (0–1) */
  maxExposure?: number;
  /** Historical exposure rate per item: { itemId: exposureRate } */
  exposureRates?: Record<string, number>;
  /** Items already administered (exclude) */
  excludeItemIds?: string[];
  /** Total item budget */
  budget: number;
}

/** CAT stopping criteria */
export interface CATStopCriteria {
  /** Stop when SE drops below this */
  seThreshold: number;
  /** Maximum items to administer */
  maxItems: number;
  /** Minimum items before allowing stop */
  minItems: number;
}

/** BKT model parameters for a skill */
export interface BKTParams {
  /** P(init) — probability mastered before first opportunity */
  pInit: number;
  /** P(learn) — probability of transitioning to mastered */
  pLearn: number;
  /** P(slip) — probability of wrong despite mastered */
  pSlip: number;
  /** P(guess) — probability of correct despite unmastered */
  pGuess: number;
}

/** BKT state for a learner-skill pair */
export interface BKTState {
  /** Current probability of mastery */
  pMastered: number;
  /** Number of observations */
  nObs: number;
  /** Last observation time */
  lastSeen: Date;
  /** Predicted time mastery drops below threshold */
  predictedForgetAt: Date | null;
}

/** Readiness computation input */
export interface ReadinessInput {
  /** Per-skill mastery probabilities */
  skillMasteries: Record<string, number>;
  /** Course cognitive emphasis weights (sum to 100) */
  /** Keys match cognitive type names (recall, comprehension, application, analysis, evaluation, synthesis, maths, procedural, data_interpretation) — values sum to ~100 */
  cognitiveEmphasis: Record<string, number>;
  /** Topic coverage: fraction covered vs. exam distribution */
  topicCoverage: number;
  /** Number of observations (drives CI width) */
  totalObservations: number;
}

/** Readiness model output — always a range, never a bare number */
export interface ReadinessResult {
  /** Point estimate (0–100) */
  point: number;
  /** Lower bound of credible interval */
  ciLow: number;
  /** Upper bound of credible interval */
  ciHigh: number;
  /** Confidence label */
  confidenceLabel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  /** Human-readable basis for the estimate */
  basis: string;
  /** Per-skill breakdown */
  skillBreakdown: Record<string, { mastery: number; weight: number; contribution: number }>;
}

/** Spaced-repetition schedule entry */
export interface ScheduleEntry {
  topic: string;
  dueAt: Date;
  strength: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

/** Calibration metrics */
export interface CalibrationResult {
  /** Brier score (0 = perfect, 1 = worst) */
  brierScore: number;
  /** Expected calibration error */
  ece: number;
  /** Bins for reliability diagram */
  reliabilityBins: Array<{
    binMidpoint: number;
    meanPredicted: number;
    meanActual: number;
    count: number;
  }>;
  /** Adjustment recommendations */
  parameterAdjustments: Array<{
    itemId: string;
    currentB: number;
    suggestedB: number;
    nResponses: number;
  }>;
}

/** Cognitive micro-test result */
export interface MicroTestResult {
  construct: 'working_memory' | 'processing_speed' | 'application' | 'prior_knowledge';
  score: number;
  ciLow: number;
  ciHigh: number;
  nTrials: number;
  skipped: boolean;
}
