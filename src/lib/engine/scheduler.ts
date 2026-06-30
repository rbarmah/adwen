/* ============================================================
   Adwen — Spaced-Repetition Scheduler (Deterministic)
   Predicts forget time and schedules reviews.
   ============================================================ */

import type { ScheduleEntry } from '@/types/engine.types';

/**
 * Generate a review schedule from mastery states.
 * Pushes confident-but-wrong topics up the priority list.
 */
export function generateSchedule(
  masteries: Array<{
    topic: string;
    pMastered: number;
    lastSeen: Date;
    predictedForgetAt: Date | null;
    confidentButWrong?: boolean;
  }>,
  now: Date = new Date()
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const m of masteries) {
    // Determine due date
    let dueAt = m.predictedForgetAt ?? new Date(now.getTime() + 24 * 3600 * 1000);

    // Priority based on mastery and flags
    let priority: ScheduleEntry['priority'] = 'low';
    let reason = 'Regular review';

    if (m.confidentButWrong) {
      priority = 'critical';
      reason = 'Confident but wrong — misconception likely';
      // Pull forward by 50%
      const timeToDue = dueAt.getTime() - now.getTime();
      dueAt = new Date(now.getTime() + timeToDue * 0.5);
    } else if (m.pMastered < 0.3) {
      priority = 'critical';
      reason = 'Very low mastery — needs focused practice';
    } else if (m.pMastered < 0.5) {
      priority = 'high';
      reason = 'Below mastery threshold';
    } else if (m.pMastered < 0.7) {
      priority = 'medium';
      reason = 'Building towards mastery';
    } else {
      priority = 'low';
      reason = 'Maintenance review';
    }

    entries.push({
      topic: m.topic,
      dueAt,
      strength: m.pMastered,
      priority,
      reason,
    });
  }

  // Sort: critical first, then by due date
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  entries.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });

  return entries;
}
