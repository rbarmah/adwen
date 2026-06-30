import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireCourseOwnership } from '@/lib/api/auth';
import { updateMastery, predictForgetTime } from '@/lib/engine/bkt';
import { estimateMultidimensionalTheta } from '@/lib/engine/irt';
import { computeReadiness } from '@/lib/engine/readiness';
import { generateSchedule } from '@/lib/engine/scheduler';

export const maxDuration = 30;

interface ResponseItem {
  itemId: string;
  correct: boolean;
  contentUnitId?: string;
  cognitiveType?: string;
  latencyMs?: number;
  confidence?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  const supabase = await createClient();

  // 1. Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ownerCheck = await requireCourseOwnership(supabase, courseId, user.id);
  if (ownerCheck !== true) return ownerCheck;

  try {
    const body = await request.json();
    const { sessionId, responses, theta, se } = body as {
      sessionId: string;
      responses: ResponseItem[];
      theta: number;
      se: number;
    };

    if (!sessionId || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 2. Close quiz session
    await (supabase.from('quiz_sessions') as any)
      .update({
        theta_final: theta,
        se_final: se,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // 3. BKT mastery updates
    const { data: masteries } = await supabase
      .from('mastery_states')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id);
    const masteryList = (masteries as any[]) || [];

    const { data: unitsData } = await supabase
      .from('content_units')
      .select('id, topic')
      .eq('course_id', courseId);
    const units = (unitsData as any[]) || [];

    const unitIdToTopic: Record<string, string> = {};
    units.forEach((u) => { unitIdToTopic[u.id] = u.topic; });

    const masteryMap: Record<string, any> = {};
    const topicMasteryProb: Record<string, number> = {};
    masteryList.forEach((m) => {
      masteryMap[m.skill_or_topic] = m;
      topicMasteryProb[m.skill_or_topic] = Number(m.p_mastered);
    });

    // Run BKT per response
    responses.forEach((resp) => {
      const topic = resp.contentUnitId ? unitIdToTopic[resp.contentUnitId] : undefined;
      if (topic && topicMasteryProb[topic] !== undefined) {
        topicMasteryProb[topic] = updateMastery(topicMasteryProb[topic], resp.correct);
      }
    });

    // Persist mastery changes
    for (const [topic, pMastered] of Object.entries(topicMasteryProb)) {
      const mRecord = masteryMap[topic];
      if (mRecord && Number(mRecord.p_mastered) !== pMastered) {
        const forgetAt = predictForgetTime(pMastered, new Date());
        await (supabase.from('mastery_states') as any)
          .update({
            p_mastered: pMastered,
            last_seen: new Date().toISOString(),
            predicted_forget_at: forgetAt ? forgetAt.toISOString() : null
          })
          .eq('id', mRecord.id);
      }
    }

    // 4. Update learner constructs via EMA
    const constructMapping: Record<string, string> = {
      application: 'application',
      maths: 'prior_knowledge',
      recall: 'prior_knowledge',
      comprehension: 'working_memory',
      analysis: 'analysis',
      evaluation: 'evaluation',
    };

    const dimEstimates = estimateMultidimensionalTheta(
      responses.map(r => ({
        itemId: r.itemId,
        correct: r.correct,
        cognitiveType: (r.cognitiveType || 'recall') as any,
        // Default IRT params — actual per-item discrimination is unknown server-side
        itemParams: { a: 1.0, b: 0.0, c: 0.25 },
      })),
      0.0, 1.0
    );

    const constructAccum: Record<string, { sum: number; count: number }> = {};
    for (const [dim, val] of Object.entries(dimEstimates)) {
      const constructName = constructMapping[dim];
      if (!constructName) continue;
      if (!constructAccum[constructName]) constructAccum[constructName] = { sum: 0, count: 0 };
      constructAccum[constructName].sum += val.theta;
      constructAccum[constructName].count++;
    }

    for (const [constructName, { sum, count }] of Object.entries(constructAccum)) {
      const avgTheta = sum / count;
      const sessionMappedValue = Math.max(0, Math.min(100, Math.round(50 + avgTheta * 16.6)));
      const { data: existing } = await supabase
        .from('learner_constructs')
        .select('*')
        .eq('user_id', user.id)
        .eq('construct', constructName)
        .maybeSingle();

      const currentObs = existing ? Number((existing as any).n_obs || 0) : 0;
      if (existing) {
        const historicalValue = Number((existing as any).value || 50);
        const weightOld = Math.min(0.8, currentObs / (currentObs + 1));
        const weightNew = 1 - weightOld;
        const newValue = Math.round(historicalValue * weightOld + sessionMappedValue * weightNew);
        await (supabase.from('learner_constructs') as any)
          .update({ value: newValue, n_obs: currentObs + 1, measured: true })
          .eq('user_id', user.id)
          .eq('construct', constructName);
      } else {
        await (supabase.from('learner_constructs') as any)
          .insert({ user_id: user.id, construct: constructName, value: sessionMappedValue, n_obs: 1, measured: true });
      }
    }

    // 5. Compute readiness estimate
    const updatedMasteries = (masteries as any[]) || [];
    const skillMasteries: Record<string, number> = {
      recall: 0.5, comprehension: 0.5, application: 0.5,
      analysis: 0.5, evaluation: 0.5, maths: 0.5,
      synthesis: 0.5, procedural: 0.5, data_interpretation: 0.5,
    };
    const avgMastery = updatedMasteries.length > 0
      ? updatedMasteries.reduce((s, m) => s + Number(m.p_mastered), 0) / updatedMasteries.length
      : 0.35;
    Object.keys(skillMasteries).forEach(k => { skillMasteries[k] = avgMastery; });

    const { data: allUnitsEmphasis } = await (supabase
      .from('content_units')
      .select('cognitive_emphasis')
      .eq('course_id', courseId) as any);
    const emphasisRows = (allUnitsEmphasis as any[]) || [];

    const COG_KEYS = ['recall','comprehension','application','analysis','evaluation','synthesis','maths','procedural','data_interpretation'];
    let courseEmphasis: Record<string, number>;
    if (emphasisRows.length > 0) {
      const emphSum: Record<string, number> = {};
      COG_KEYS.forEach(k => { emphSum[k] = 0; });
      emphasisRows.forEach((row: any) => {
        const em = row.cognitive_emphasis || {};
        COG_KEYS.forEach(k => { emphSum[k] += Number(em[k]) || 0; });
      });
      COG_KEYS.forEach(k => { emphSum[k] = Math.round(emphSum[k] / emphasisRows.length); });
      courseEmphasis = emphSum;
    } else {
      courseEmphasis = { recall: 15, comprehension: 15, application: 15, analysis: 15, evaluation: 10, synthesis: 10, maths: 10, procedural: 5, data_interpretation: 5 };
    }

    const readinessResult = computeReadiness({
      skillMasteries,
      cognitiveEmphasis: courseEmphasis as any,
      topicCoverage: Math.min(1, responses.length / Math.max(1, updatedMasteries.length * 9)),
      totalObservations: responses.length,
    });

    await (supabase.from('readiness_estimates') as any).insert({
      user_id: user.id,
      course_id: courseId,
      point: Math.round(readinessResult.point),
      ci_low: Math.round(readinessResult.ciLow),
      ci_high: Math.round(readinessResult.ciHigh),
      confidence_label: readinessResult.confidenceLabel,
      basis: readinessResult.basis,
    });

    // 6. Spaced repetition schedule — scoped to THIS user
    const { data: schedMasteries } = await supabase
      .from('mastery_states')
      .select('skill_or_topic, p_mastered, last_seen, predicted_forget_at')
      .eq('course_id', courseId)
      .eq('user_id', user.id);

    const schedEntries = generateSchedule(
      ((schedMasteries as any[]) || []).map((m) => ({
        topic: m.skill_or_topic,
        pMastered: Number(m.p_mastered),
        lastSeen: m.last_seen ? new Date(m.last_seen) : new Date(),
        predictedForgetAt: m.predicted_forget_at ? new Date(m.predicted_forget_at) : null,
        confidentButWrong: false,
      }))
    );

    // Delete only THIS user's schedule entries (fix: was deleting all users' entries)
    await (supabase.from('review_schedule') as any)
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);

    if (schedEntries.length > 0) {
      await (supabase.from('review_schedule') as any).insert(
        schedEntries.map((e: any) => ({
          user_id: user.id,
          course_id: courseId,
          topic: e.topic,
          due_at: e.dueAt.toISOString(),
          strength: e.strength,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      readiness: {
        point: Math.round(readinessResult.point),
        ciLow: Math.round(readinessResult.ciLow),
        ciHigh: Math.round(readinessResult.ciHigh),
      }
    });

  } catch (error: unknown) {
    console.error('[end-quiz] Error:', error);
    return NextResponse.json({ error: 'Failed to save quiz results. Please try again.' }, { status: 500 });
  }
}
