'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import { ConfidenceBand } from '@/components/ui/ProgressBar';
import SkillRadar from '@/components/ui/SkillRadar';
import { createClient } from '@/lib/supabase/client';
import { computeColdStartReadiness } from '@/lib/engine/readiness';

export default function DiagnosisPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [readiness, setReadiness] = useState<any>({ point: 50, ciLow: 15, ciHigh: 85, confidence: 'Very Low' });
  const [skills, setSkills] = useState<{ name: string; value: number }[]>([
    { name: 'Memory', value: 50 },
    { name: 'Application', value: 50 },
    { name: 'Maths', value: 50 },
    { name: 'Recall', value: 50 },
  ]);
  const [actionPlan, setActionPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');

  const [narrative, setNarrative] = useState<any>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);

  useEffect(() => {
    const fetchDiagnosisData = async () => {
      if (!courseId) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        if (courseError) throw courseError;
        const course = courseData as any;
        setCourseName(course.name);

        // 2. Fetch learner constructs
        const { data: constructs, error: constError } = await supabase
          .from('learner_constructs')
          .select('construct, value')
          .eq('user_id', user.id);
        if (constError) throw constError;

        // Map constructs to key/values
        const constructMap: Record<string, number> = {};
        let sum = 0;
        let count = 0;
        ((constructs as any) || []).forEach((c: any) => {
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

        // 3. Compute Cold Start Readiness
        const result = computeColdStartReadiness(constructMap, course.self_difficulty || 5);
        const readinessObj = {
          point: Math.round(result.point),
          ciLow: Math.round(result.ciLow),
          ciHigh: Math.round(result.ciHigh),
          confidence: 'Low Confidence'
        };
        setReadiness(readinessObj);

        // Map constructs to skills labels (display values in 0–100 scale)
        const skillValues = [
          { name: 'Working Memory',    value: constructMap.working_memory   ?? 50 },
          { name: 'Processing Speed',  value: constructMap.processing_speed ?? 50 },
          { name: 'Application',       value: constructMap.application       ?? 50 },
          { name: 'Prior Knowledge',   value: constructMap.prior_knowledge  ?? 50 },
          { name: 'Analysis',          value: constructMap.analysis          ?? constructMap.application ?? 50 },
          { name: 'Evaluation',        value: constructMap.evaluation        ?? constructMap.application ?? 50 },
        ];
        setSkills(skillValues);


        // 4. Fetch mastery states to compile action plan based on lowest mastery
        const { data: masteryData } = await supabase
          .from('mastery_states')
          .select('*')
          .eq('course_id', courseId)
          .order('p_mastered', { ascending: true });

        const computedPlan = ((masteryData as any) || []).slice(0, 4).map((m: any, i: number) => {
          const currentPercent = Math.round(m.p_mastered * 100);
          const potentialGain = [12, 8, 6, 4][i]; // scaled based on priority
          return {
            rank: i + 1,
            topic: m.skill_or_topic,
            gain: `+${potentialGain} points`,
            reason: `Current mastery: ${currentPercent}% — focus here will move your score most.`
          };
        });

        setActionPlan(computedPlan);
        setLoading(false);

        // 5. Trigger Diagnosis Narrator Agent call
        setLoadingNarrative(true);
        try {
          const response = await fetch(`/api/courses/${courseId}/diagnosis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              readiness: readinessObj,
              skills: skillValues,
              actionPlan: computedPlan
            })
          });

          if (!response.ok) throw new Error('Narrator API failed');
          const data = await response.json();
          setNarrative(data);
        } catch (narrError) {
          console.warn('Diagnosis narrator fallback:', narrError);
          setNarrative({
            summary: "We've analyzed your cognitive profile against the specific demands of this course. Based on your current mastery levels and learning constructs, we've identified key areas where focused study will yield the highest returns.",
            encouragement: "Consistency is key. Focus on your top-ranked action items to build momentum.",
            readiness_statement: "Baseline Estimate",
            skill_commentary: []
          });
        } finally {
          setLoadingNarrative(false);
        }

      } catch (err) {
        console.error('Error loading diagnosis:', err);
        setLoading(false);
      }
    };

    fetchDiagnosisData();
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
        <Badge variant="cobalt" size="sm" style={{ marginBottom: '8px' }}>Stage 4</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          YOUR{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>diagnosis</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
          Where you stand in {courseName}
        </p>
      </div>

      {/* Narrator Summary */}
      {loadingNarrative && (
        <Card padding="lg" style={{ marginBottom: '24px' }}>
          <div className="skeleton" style={{ height: '20px', width: '180px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '80px' }} />
        </Card>
      )}

      {narrative && !loadingNarrative && (
        <Card padding="lg" style={{ marginBottom: '24px', background: 'rgba(212,237,42,0.06)' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '10px' }}>Narrative Diagnosis</h2>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--ink)' }}>{narrative.summary}</p>
          <div style={{ marginTop: '12px', fontStyle: 'italic', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            &ldquo;{narrative.encouragement}&rdquo;
          </div>
        </Card>
      )}

      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Readiness Range */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle size={14} />
            Readiness Range
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '24px' }}>
            This is an estimate with a credible interval based on your onboarding profile and course difficulty.
          </p>
          <ConfidenceBand
            point={readiness.point}
            ciLow={readiness.ciLow}
            ciHigh={readiness.ciHigh}
            label="Exam Readiness"
            confidenceLabel={narrative?.readiness_statement || readiness.confidence}
            color="var(--cobalt)"
          />
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
              color: 'var(--muted)',
            }}
          >
            <strong style={{ color: 'var(--ink)' }}>What this means:</strong> Based on your profile and self-difficulty ratings, your readiness midpoint is estimated at{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{readiness.point}%</strong>, spanning from{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{readiness.ciLow}%</strong> to{' '}
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{readiness.ciHigh}%</strong>.
            This range is wide (±35 points) because we have not yet observed you solving questions.
          </div>
        </Card>

        {/* Skill Radar */}
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px', alignSelf: 'flex-start' }}>
            Skill Map
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px', alignSelf: 'flex-start' }}>
            Your cognitive strengths for this course
          </p>
          <SkillRadar skills={skills} size={260} />
        </Card>
      </div>

      {/* Skill Commentaries */}
      {narrative && !loadingNarrative && (
        <Card padding="lg" style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle size={14} />
            Cognitive Strengths Analysis
          </h2>
          <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {narrative.skill_commentary.map((sc: any) => (
              <div key={sc.skill} style={{ border: '1.5px solid var(--ink)', padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--cobalt)' }}>{sc.skill}</h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink)', marginTop: '8px', lineHeight: 1.5 }}>{sc.commentary}</p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Growth:</span>
                  <Badge variant="green" size="sm">{sc.growth_potential}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ranked Action Plan */}
      <Card padding="lg" style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkle size={14} />
          What Moves Your Score Most
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '20px' }}>
          Ranked by expected impact — tackle the top items first
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loadingNarrative && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="skeleton" style={{ height: '60px' }} />
              <div className="skeleton" style={{ height: '60px' }} />
            </div>
          )}

          {!loadingNarrative && (narrative?.ranked_plan || actionPlan).map((item: any) => (
            <div
              key={item.rank}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                background: item.rank === 1 ? 'rgba(42,59,201,0.04)' : 'var(--surface)',
                border: item.rank === 1 ? '2px solid var(--cobalt)' : '1px solid var(--line)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: item.rank === 1 ? 'var(--cobalt)' : 'var(--line)',
                  color: item.rank === 1 ? 'var(--white)' : 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  flexShrink: 0,
                }}
              >
                {item.rank}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{item.action || item.topic}</h3>
                  <Badge variant={item.rank === 1 ? 'cobalt' : 'muted'} size="sm">
                    {item.expected_gain || item.gain}
                  </Badge>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.topic && item.action ? `Topic: ${item.topic}. ` : ''}{item.reason || item.message || ''}
                </p>
              </div>
            </div>
          ))}
          {(!loadingNarrative && actionPlan.length === 0 && !narrative) && (
            <p className="note">No study recommendation available yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
