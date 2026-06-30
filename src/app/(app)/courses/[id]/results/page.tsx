'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ConfidenceBand } from '@/components/ui/ProgressBar';
import SkillRadar from '@/components/ui/SkillRadar';
import { createClient } from '@/lib/supabase/client';

const formatDueAt = (dueAt: Date) => {
  const diffTime = dueAt.getTime() - Date.now();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Overdue';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
};

export default function ResultsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [history, setHistory] = useState<any[]>([]);
  const [latestReadiness, setLatestReadiness] = useState<any>({ point: 50, ciLow: 15, ciHigh: 85, confidence: 'very_low' });
  const [skills, setSkills] = useState<{ name: string; value: number }[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [reviewSchedule, setReviewSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResultsData = async () => {
      if (!courseId) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch content units (to compute emphasis & coverage)
        const { data: unitsData } = await supabase.from('content_units').select('*').eq('course_id', courseId);
        const units = (unitsData as any) || [];
        
        // 2. Fetch learner constructs
        const { data: constructsData } = await supabase.from('learner_constructs').select('*').eq('user_id', user.id);
        const constructs = (constructsData as any) || [];
        const constructMap: Record<string, number> = {};
        let sum = 0;
        let count = 0;
        constructs.forEach((c: any) => {
          const val = Number(c.value);
          constructMap[c.construct] = val;
          sum += val;
          count++;
        });
        const baseline = count > 0 ? Math.round(sum / count) : 50;

        // Fill missing core constructs with the baseline
        ['working_memory', 'processing_speed', 'application', 'prior_knowledge', 'analysis', 'evaluation'].forEach(k => {
          if (constructMap[k] === undefined) constructMap[k] = baseline;
        });

        // 3. Fetch response events
        const { data: eventsData } = await supabase
          .from('response_events')
          .select('*, items(*)')
          .eq('user_id', user.id);

        const events = (eventsData as any) || [];
        const courseEvents = events.filter((e: any) => e.items && e.items.course_id === courseId);
        const totalObs = courseEvents.length;

        // 4. Compute cognitive emphasis — average all 9 types across all topics
        const COG_KEYS = ['recall','comprehension','application','analysis','evaluation','synthesis','maths','procedural','data_interpretation'];
        const cogSum: Record<string, number> = {};
        COG_KEYS.forEach(k => { cogSum[k] = 0; });
        if (units.length > 0) {
          units.forEach((u: any) => {
            const em = u.cognitive_emphasis || {};
            COG_KEYS.forEach(k => { cogSum[k] += Number(em[k]) || 0; });
          });
          COG_KEYS.forEach(k => { cogSum[k] = Math.round(cogSum[k] / units.length); });
        } else {
          COG_KEYS.forEach(k => { cogSum[k] = Math.round(100 / COG_KEYS.length); });
        }
        const cognitiveEmphasis = cogSum;

        // 5. Compute topic coverage — count distinct topics that have been tested
        // (item has a content_unit_id, and that unit belongs to this course)
        const testedTopicIds = new Set(
          courseEvents
            .filter((e: any) => e.items?.content_unit_id)
            .map((e: any) => e.items.content_unit_id)
        );
        const totalTopicsCount = Math.max(1, units.length);
        const topicCoverage = Math.max(0.1, Math.min(1.0, testedTopicIds.size / totalTopicsCount));

        // 6. Skill map — normalise construct values from 0–100 to 0–1 for the readiness engine
        const norm = (v: number) => Math.max(0, Math.min(100, v)) / 100;
        const skillMasteries = {
          recall:        norm(constructMap.prior_knowledge  ?? 50),
          comprehension: norm(constructMap.working_memory   ?? 50),
          application:   norm(constructMap.application      ?? 50),
          analysis:      norm(constructMap.analysis         ?? constructMap.application ?? 50),
          evaluation:    norm(constructMap.evaluation       ?? constructMap.application ?? 50),
          maths:         norm(Math.round((constructMap.prior_knowledge ?? 50) * 0.5 + (constructMap.application ?? 50) * 0.5)),
        };

        // Skill radar still uses 0–100 display values
        setSkills([
          { name: 'Recall',        value: Math.round(norm(constructMap.prior_knowledge  ?? 50) * 100) },
          { name: 'Comprehension', value: Math.round(norm(constructMap.working_memory   ?? 50) * 100) },
          { name: 'Application',   value: Math.round(norm(constructMap.application      ?? 50) * 100) },
          { name: 'Analysis',      value: Math.round(norm(constructMap.analysis         ?? constructMap.application ?? 50) * 100) },
          { name: 'Evaluation',    value: Math.round(norm(constructMap.evaluation       ?? constructMap.application ?? 50) * 100) },
          { name: 'Maths',         value: Math.round(norm(Math.round((constructMap.prior_knowledge ?? 50) * 0.5 + (constructMap.application ?? 50) * 0.5)) * 100) },
        ]);

        // 7. Fetch readiness history (ascending = oldest first for timeline) and latest estimate
        const { data: allReadinessData } = await (supabase.from('readiness_estimates') as any)
          .select('point, ci_low, ci_high, confidence_label, created_at')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        const allEstimates = (allReadinessData as any[]) || [];

        // Populate history timeline
        if (allEstimates.length > 0) {
          setHistory(allEstimates.map((r: any) => ({
            date: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            point: Math.round(r.point),
            ciLow: Math.round(r.ci_low),
            ciHigh: Math.round(r.ci_high),
          })));
        }

        const latestRaw = allEstimates[allEstimates.length - 1] as any;
        if (latestRaw) {
          setLatestReadiness({
            point:      Math.round(latestRaw.point),
            ciLow:      Math.round(latestRaw.ci_low),
            ciHigh:     Math.round(latestRaw.ci_high),
            confidence: (latestRaw.confidence_label ?? 'very_low').replace('_', ' '),
          });
        } else {
          // Cold-start: no DB estimate yet — compute a provisional one (do NOT insert)
          const { computeReadiness } = await import('@/lib/engine/readiness');
          const coldResult = computeReadiness({ skillMasteries, cognitiveEmphasis, topicCoverage, totalObservations: totalObs });
          setLatestReadiness({
            point:      Math.round(coldResult.point),
            ciLow:      Math.round(coldResult.ciLow),
            ciHigh:     Math.round(coldResult.ciHigh),
            confidence: (coldResult.confidenceLabel ?? 'very_low').replace('_', ' '),
          });
        }

        // 10. Extract flags (confident-but-wrong and slow-correct)
        const latestSessionEvents = courseEvents.slice(-8); // analyze last quiz session
        const cbwEvents = latestSessionEvents.filter((e: any) => !e.is_correct && (e.stated_confidence === 'certain' || e.stated_confidence === 'fairly'));
        
        const correctEvents = latestSessionEvents.filter((e: any) => e.is_correct);
        const avgCorrectTime = correctEvents.length > 0 
          ? correctEvents.reduce((sum: number, e: any) => sum + e.latency_ms, 0) / correctEvents.length 
          : 0;

        const newFlags: any[] = [];
        if (cbwEvents.length > 0) {
          newFlags.push({
            type: 'confident_but_wrong',
            topic: (cbwEvents[0].items?.stem?.slice(0, 30) || 'Question') + '...',
            message: `You were confident but wrong on ${cbwEvents.length} item(s). This pattern suggests a hidden gap. We will prioritize these topics.`
          });
        }
        if (avgCorrectTime > 8000) { // average latency > 8s
          newFlags.push({
            type: 'slow_correct',
            topic: 'Pacing Warning',
            message: `You are answering correctly but slowly (avg ${(avgCorrectTime / 1000).toFixed(1)}s on correct answers). Timed drills will help build speed.`
          });
        }
        setFlags(newFlags);

        // 11. Populate review schedule using deterministic spaced-repetition scheduler
        const { data: masteryData } = await supabase
          .from('mastery_states')
          .select('*')
          .eq('course_id', courseId)
          .order('p_mastered', { ascending: true });

        const masteryList = (masteryData as any) || [];

        const unitMap: Record<string, string> = {};
        units.forEach((u: any) => {
          unitMap[u.id] = u.topic;
        });

        const cbwTopics = new Set<string>();
        cbwEvents.forEach((e: any) => {
          if (e.items?.content_unit_id) {
            const topic = unitMap[e.items.content_unit_id];
            if (topic) {
              cbwTopics.add(topic);
            }
          }
        });

        const masteriesForSchedule = masteryList.map((m: any) => ({
          topic: m.skill_or_topic,
          pMastered: Number(m.p_mastered),
          lastSeen: m.last_seen ? new Date(m.last_seen) : new Date(),
          predictedForgetAt: m.predicted_forget_at ? new Date(m.predicted_forget_at) : null,
          confidentButWrong: cbwTopics.has(m.skill_or_topic)
        }));

        // 10. Load review schedule from DB (written by quiz end handler — do NOT rebuild here)
        const { data: scheduleRows } = await (supabase.from('review_schedule') as any)
          .select('topic, due_at, strength')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .order('due_at', { ascending: true });

        if (scheduleRows && scheduleRows.length > 0) {
          setReviewSchedule((scheduleRows as any[]).map((r: any) => ({
            topic:    r.topic,
            priority: (() => { const d = new Date(r.due_at); const now = Date.now(); const diff = d.getTime() - now; if (diff < 0) return 'critical'; if (diff < 86400000) return 'high'; if (diff < 3 * 86400000) return 'medium'; return 'low'; })(),
            dueAt:    formatDueAt(new Date(r.due_at)),
            strength: r.strength,
          })));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResultsData();
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <Badge variant="cobalt" size="sm" style={{ marginBottom: '8px' }}>Stage 7</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          YOUR{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>results</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
          Updated diagnosis — see how your range is tightening
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Current readiness */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle size={14} />
            Updated Readiness
          </h2>
          <ConfidenceBand
            point={latestReadiness.point}
            ciLow={latestReadiness.ciLow}
            ciHigh={latestReadiness.ciHigh}
            label="Exam Readiness"
            confidenceLabel={latestReadiness.confidence}
            color="var(--cobalt)"
          />
        </Card>

        {/* Skill radar */}
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px', alignSelf: 'flex-start' }}>
            Skill Map
          </h2>
          <SkillRadar skills={skills} size={240} />
        </Card>
      </div>

      {/* Band tightening history */}
      <Card padding="lg" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px' }}>
          Readiness History — Band Tightening
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
          Watch your confidence range narrow as you practice more
        </p>

        {/* Visual timeline */}
        <div style={{ position: 'relative', paddingLeft: '24px' }}>
          {history.map((h, i) => {
            const width = h.ciHigh - h.ciLow;
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 0',
                  borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-24px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: i === history.length - 1 ? 'var(--cobalt)' : 'var(--line)',
                    border: '2px solid var(--surface-2)',
                  }}
                />

                <div style={{ width: '120px', fontSize: 'var(--text-sm)', color: 'var(--muted)', flexShrink: 0 }}>
                  {h.date}
                </div>

                {/* Mini confidence band */}
                <div style={{ flex: 1, position: 'relative', height: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-pill)' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${h.ciLow}%`,
                      width: `${width}%`,
                      height: '100%',
                      background: 'var(--cobalt)',
                      opacity: 0.2,
                      borderRadius: 'var(--radius-pill)',
                      transition: 'all var(--transition-smooth)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${h.point}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '8px',
                      background: 'var(--cobalt)',
                      borderRadius: '50%',
                      border: '1.5px solid var(--white)',
                    }}
                  />
                </div>

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', width: '80px', textAlign: 'right', color: 'var(--ink)', fontWeight: 600 }}>
                  {h.ciLow}–{h.ciHigh}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Flags */}
      {flags.length > 0 && (
        <Card padding="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Patterns to Address
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {flags.map((flag, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: flag.type === 'confident_but_wrong' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${flag.type === 'confident_but_wrong' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`,
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <Badge
                    variant={flag.type === 'confident_but_wrong' ? 'danger' : 'tangerine'}
                    size="sm"
                  >
                    {flag.type === 'confident_but_wrong' ? 'Confident but wrong' : 'Accurate but slow'}
                  </Badge>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{flag.topic}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {flag.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Review Schedule */}
      <Card padding="lg">
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkle size={14} />
          Review Schedule
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
          Timed to catch you just before you&apos;re predicted to forget
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reviewSchedule.map((item, idx) => (
            <div
              key={`${item.topic}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: item.priority === 'critical' ? 'rgba(239,68,68,0.04)' : 'var(--surface)',
                border: item.priority === 'critical' ? '1px solid rgba(239,68,68,0.15)' : '1px solid var(--line)',
              }}
            >
              <Badge
                variant={
                  item.priority === 'critical' ? 'danger' :
                  item.priority === 'high' ? 'tangerine' :
                  item.priority === 'medium' ? 'cobalt' : 'muted'
                }
                size="sm"
              >
                {item.priority}
              </Badge>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{item.topic}</p>
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {item.dueAt}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
