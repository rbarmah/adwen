/* ============================================================
   Adwen — CAT Adaptive Selector (Deterministic)
   Selects items that maximise information near theta.
   ============================================================ */

import type { Item } from '@/types/database.types';
import type { CATConstraints, CATStopCriteria } from '@/types/engine.types';
import { fisherInformation } from './irt';

/**
 * Select the next item from the bank that maximises Fisher information
 * near the current theta estimate, subject to constraints.
 */
export function selectNextItem(
  theta: number,
  availableItems: Item[],
  constraints: CATConstraints
): Item | null {
  // Filter out already-administered items
  const candidates = availableItems.filter(
    (item) => !constraints.excludeItemIds?.includes(item.id)
  );

  if (candidates.length === 0) return null;

  // Score each candidate by Fisher information
  const scored = candidates.map((item) => {
    const info = fisherInformation(theta, {
      a: item.discrimination_a,
      b: item.difficulty_b,
      c: item.guessing_c,
    });

    // Apply constraint bonuses/penalties
    let adjustedScore = info;

    // 1. Exposure Penalty (Sympson-Hetter Fading analog)
    const expRate = constraints.exposureRates?.[item.id] ?? 0;
    if (constraints.maxExposure && expRate > constraints.maxExposure) {
      adjustedScore *= 0.1; // Heavy penalty if overexposed
    } else {
      adjustedScore *= (1 - expRate); // Demote frequently selected items
    }

    // 2. Topic coverage bonus: prefer under-represented topics
    const topicKey = item.content_unit_id || '';
    if (constraints.topicTargets && constraints.topicCounts) {
      const target = constraints.topicTargets[topicKey] ?? 0.1;
      const count = constraints.topicCounts[topicKey] ?? 0;
      const total = Object.values(constraints.topicCounts).reduce((a, b) => a + b, 0) || 1;
      const currentProp = count / total;
      if (currentProp < target) {
        adjustedScore *= 1.25; // 25% bonus for under-represented topics
      }
    }

    // 3. Cognitive type balance
    const cogType = item.cognitive_type;
    if (constraints.cognitiveTypeTargets && constraints.cognitiveTypeCounts) {
      const target = constraints.cognitiveTypeTargets[cogType] ?? 0.25;
      const count = constraints.cognitiveTypeCounts[cogType] ?? 0;
      const total = Object.values(constraints.cognitiveTypeCounts).reduce((a, b) => a + b, 0) || 1;
      const currentProp = count / total;
      if (currentProp < target) {
        adjustedScore *= 1.25; // 25% bonus for under-represented cognitive types
      }
    }

    return { item, score: adjustedScore };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.item ?? null;
}

/**
 * Check if the CAT should stop.
 */
export function shouldStop(
  se: number,
  itemCount: number,
  criteria: CATStopCriteria
): boolean {
  // Must administer minimum items
  if (itemCount < criteria.minItems) return false;

  // Stop if SE threshold met
  if (se <= criteria.seThreshold) return true;

  // Stop if budget exhausted
  if (itemCount >= criteria.maxItems) return true;

  return false;
}

/**
 * Get the default CAT stop criteria.
 */
export function getDefaultStopCriteria(): CATStopCriteria {
  return {
    seThreshold: 0.35,
    maxItems: 30,   // up from 20 — deeper sessions with larger item bank
    minItems: 10,   // up from 8 — always show at least 10 questions
  };
}

export interface BankHealthReport {
  healthy: boolean;
  totalItems: number;
  warnings: string[];
  gaps: Array<{ topicId: string; topicName: string; missingType: string; reason: string }>;
}

/**
 * Audit the item bank for missing question coverage.
 */
export function monitorBankHealth(
  items: Item[],
  topics: Array<{ id: string; name: string }>
): BankHealthReport {
  const warnings: string[] = [];
  const gaps: BankHealthReport['gaps'] = [];

  if (items.length === 0) {
    return {
      healthy: false,
      totalItems: 0,
      warnings: ['Item bank is completely empty.'],
      gaps: []
    };
  }

  // Count items per topic and cognitive type
  const counts: Record<string, Record<string, number>> = {};
  topics.forEach(t => {
    counts[t.id] = {
      recall: 0, comprehension: 0, application: 0, analysis: 0,
      evaluation: 0, synthesis: 0, maths: 0, procedural: 0, data_interpretation: 0,
    };
  });

  items.forEach(item => {
    if (item.content_unit_id && counts[item.content_unit_id]) {
      counts[item.content_unit_id][item.cognitive_type] = (counts[item.content_unit_id][item.cognitive_type] || 0) + 1;
    }
  });

  topics.forEach(t => {
    const topicCounts = counts[t.id];
    if (!topicCounts) return;
    
    if (topicCounts.recall < 1) {
      gaps.push({
        topicId: t.id,
        topicName: t.name,
        missingType: 'recall',
        reason: `Topic lacks a "recall" type question.`
      });
    }
    if (topicCounts.application < 1) {
      gaps.push({
        topicId: t.id,
        topicName: t.name,
        missingType: 'application',
        reason: `Topic lacks an "application" type question.`
      });
    }
  });

  if (gaps.length > 0) {
    warnings.push(`Detected ${gaps.length} coverage gaps in the item bank.`);
  }

  return {
    healthy: gaps.length === 0,
    totalItems: items.length,
    warnings,
    gaps
  };
}
