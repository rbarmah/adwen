'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { createClient } from '@/lib/supabase/client';

// ── helpers ──────────────────────────────────────────────────────────────────

function gradeBand(score: number): { grade: string; colour: string } {
  if (score >= 80) return { grade: 'A',  colour: '#16A34A' };
  if (score >= 70) return { grade: 'B+', colour: '#2563EB' };
  if (score >= 60) return { grade: 'B',  colour: 'var(--cobalt)' };
  if (score >= 50) return { grade: 'C',  colour: 'var(--tangerine)' };
  if (score >= 40) return { grade: 'D',  colour: '#EA580C' };
  return { grade: 'F', colour: 'var(--danger)' };
}

function fmtTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const COG_LABEL: Record<string, string> = {
  recall: 'Recall', comprehension: 'Comprehension', application: 'Application',
  analysis: 'Analysis', evaluation: 'Evaluation', synthesis: 'Synthesis',
  maths: 'Maths', procedural: 'Procedural', data_interpretation: 'Data Interpretation',
};

const COG_COLOR: Record<string, string> = {
  maths: 'var(--magenta)', application: 'var(--cobalt)', recall: 'var(--tangerine)',
  comprehension: '#0891B2', analysis: '#7C3AED', evaluation: 'var(--lime)',
  synthesis: '#059669', procedural: '#DC2626', data_interpretation: '#D97706',
};

// ── component ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const params   = useParams();
  const courseId = params.id as string;

  const [status,       setStatus]       = useState<'loading' | 'ready' | 'empty'>('loading');
  const [readiness,    setReadiness]    = useState<{ point: number; lo: number; hi: number; confidence: string; basis: string } | null>(null);
  const [topics,       setTopics]       = useState<any[]>([]);
  const [cogAccuracy,  setCogAccuracy]  = useState<Record<string, { correct: number; total: number }>>({});
  const [telemetry,    setTelemetry]    = useState<{ avgLatency: number; totalQ: number; accuracy: number; guessRate: number; sessions: number }>({ avgLatency: 0, totalQ: 0, accuracy: 0, guessRate: 0, sessions: 0 });
  const [profile,      setProfile]      = useState<any>(null);
  const [constructs,   setConstructs]   = useState<Record<string, number>>({});
  
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch('/api/analyze-course-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readiness, matrix, telemetry, cogAccuracy, profile, constructs
        })
      });
      const data = await res.json();
      if (data.analysis) {
        let parsed;
        if (typeof data.analysis === 'string') {
          try { parsed = JSON.parse(data.analysis); } catch(e) { console.error('Parse err', e); }
        } else {
          parsed = data.analysis;
        }
        if (parsed?.insights && Array.isArray(parsed.insights)) {
          setInsights(parsed.insights);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!courseId) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ── 1. Readiness estimate ──
      const { data: rdData } = await (supabase
        .from('readiness_estimates')
        .select('point, ci_low, ci_high')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(1) as any);

      if (rdData && rdData.length > 0) {
        const r = rdData[0] as any;
        setReadiness({
          point: Math.round(Number(r.point)),
          lo: r.ci_low  !== null ? Math.round(Number(r.ci_low))  : Math.max(0,   Math.round(Number(r.point)) - 15),
          hi: r.ci_high !== null ? Math.round(Number(r.ci_high)) : Math.min(100, Math.round(Number(r.point)) + 15),
          confidence: (r.confidence_label || 'low') as string,
          basis: (r.basis || '') as string,
        });
      }

      // ── 2. Topic mastery (live BKT) ──
      const [{ data: masteryData }, { data: unitsData }] = await Promise.all([
        supabase.from('mastery_states').select('skill_or_topic, p_mastered').eq('course_id', courseId),
        supabase.from('content_units').select('topic, exam_weight').eq('course_id', courseId).order('ordered_index'),
      ]);

      const masteryMap = new Map<string, number>();
      ((masteryData as any[]) || []).forEach((m: any) => masteryMap.set(m.skill_or_topic, Number(m.p_mastered)));

      const topicList = ((unitsData as any[]) || []).map((u: any) => ({
        name:    u.topic,
        weight:  Number(u.exam_weight) || 0,
        mastery: masteryMap.has(u.topic) ? Math.round((masteryMap.get(u.topic)!) * 100) : null,
      }));
      setTopics(topicList);
      // ── 3. Response events for this course's sessions ──
      const { data: sessData } = await (supabase
        .from('quiz_sessions')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', user.id) as any);

      const sessionIds = new Set(((sessData as any[]) || []).map((s: any) => s.id));

      const { data: courseEvData } = await (supabase
        .from('response_events')
        .select('is_correct, latency_ms, stated_confidence, items(cognitive_type)')
        .eq('user_id', user.id)
        .in('session_id', sessionIds.size > 0 ? [...sessionIds] : ['none']) as any);


      const events = (courseEvData as any[]) || [];
      const totalQ = events.length;

      if (totalQ > 0) {
        const correct   = events.filter(e => e.is_correct).length;
        const latencies = events.map(e => Number(e.latency_ms)).filter(Boolean);
        const avgLat    = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
        // Guessing signal: answered in < 4 seconds AND wrong
        const guesses   = events.filter(e => !e.is_correct && Number(e.latency_ms) < 4000).length;

        setTelemetry({
          totalQ,
          accuracy:    Math.round((correct / totalQ) * 100),
          avgLatency:  avgLat,
          guessRate:   Math.round((guesses / totalQ) * 100),
          sessions:    sessionIds.size,
        });

        // Cognitive type accuracy breakdown
        const cogMap: Record<string, { correct: number; total: number }> = {};
        events.forEach((e: any) => {
          const ct = e.items?.cognitive_type || 'unknown';
          if (!cogMap[ct]) cogMap[ct] = { correct: 0, total: 0 };
          cogMap[ct].total++;
          if (e.is_correct) cogMap[ct].correct++;
        });
        setCogAccuracy(cogMap);
      }

      // ── 4. Student profile + constructs ──
      const [{ data: prof }, { data: cons }] = await Promise.all([
        (supabase.from('profiles').select('*').eq('id', user.id).single() as any),
        (supabase.from('learner_constructs').select('construct, value').eq('user_id', user.id) as any),
      ]);
      if (prof) setProfile(prof);
      const cmap: Record<string, number> = {};
      ((cons as any[]) || []).forEach((c: any) => { cmap[c.construct] = Number(c.value); });
      setConstructs(cmap);

      setStatus(totalQ === 0 && !rdData?.length ? 'empty' : 'ready');
    };
    load();
  }, [courseId]);

  // ── Strength / Gap matrix sorted by exam weight ──
  const matrix = topics
    .filter(t => t.mastery !== null)
    .sort((a, b) => b.weight - a.weight)
    .map(t => ({
      ...t,
      tier: t.mastery >= 70 ? 'strong' : t.mastery >= 40 ? 'shaky' : 'gap',
    }));

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }} className="animate-fade-in">
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>📊</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, textTransform: 'uppercase', marginBottom: 12 }}>
          No Data Yet
        </h2>
        <p style={{ color: 'var(--muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
          Complete at least one quiz session for this course and your Personal Intelligence will populate automatically.
        </p>
      </div>
    );
  }

  const { grade, colour: gradeColour } = gradeBand(readiness?.point ?? 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Badge variant="cobalt" size="sm" style={{ marginBottom: 8 }}>Personal Intelligence</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          YOUR{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Performance</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 4 }}>
          {telemetry.sessions} session{telemetry.sessions !== 1 ? 's' : ''} · {telemetry.totalQ} questions answered · live analytics
        </p>
      </div>

      {/* ── Row 1: Exam Readiness + At-a-Glance Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 20 }}>

        {/* Exam Readiness */}
        <Card padding="lg" style={{ background: 'var(--cobalt-deep)', color: '#fff' }}>
          <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9499E0', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
            Exam Readiness
          </div>
          {readiness ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {readiness.point}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 900, color: gradeColour }}>
                  {grade}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9499E0', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
                {readiness.lo}% – {readiness.hi}% &nbsp;·&nbsp;
                <span style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 9 }}>
                  {readiness.confidence?.replace('_', ' ')} confidence
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${readiness.point}%`, background: 'var(--lime)', borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 11, color: '#9499E0', marginTop: 10, lineHeight: 1.5 }}>
                {readiness.basis || `If your exam were held today, our model predicts a score between ${readiness.lo}%–${readiness.hi}% based on your BKT mastery, IRT θ, and response patterns.`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#9499E0' }}>Readiness estimate will appear after your first quiz session.</p>
          )}
        </Card>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Overall Accuracy',  value: `${telemetry.accuracy}%`,        sub: `${telemetry.totalQ} questions`,           colour: telemetry.accuracy >= 70 ? '#16A34A' : telemetry.accuracy >= 50 ? 'var(--cobalt)' : 'var(--danger)' },
            { label: 'Avg Response Time', value: fmtTime(telemetry.avgLatency),   sub: 'per question',                            colour: telemetry.avgLatency < 8000 ? '#16A34A' : 'var(--tangerine)' },
            { label: 'Sessions Complete', value: `${telemetry.sessions}`,         sub: 'study sessions',                          colour: 'var(--cobalt)' },
            { label: 'Guess Rate',        value: `${telemetry.guessRate}%`,       sub: '< 4s wrong answers',                      colour: telemetry.guessRate > 20 ? 'var(--danger)' : 'var(--lime)' },
          ].map(stat => (
            <Card key={stat.label} padding="lg" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 900, color: stat.colour, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, marginTop: 6, marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{stat.sub}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Row 2: Cognitive Accuracy + Strength/Gap Matrix ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Accuracy by Cognitive Type */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 4 }}>Accuracy by Skill Type</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 16 }}>Where you actually perform — not just what the course emphasises</p>
          {Object.keys(cogAccuracy).length === 0 ? (
            <p className="note">No breakdown yet — complete more quiz sessions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(cogAccuracy)
                .sort(([,a], [,b]) => (b.correct / b.total) - (a.correct / a.total))
                .map(([type, { correct, total }]) => {
                  const pct = Math.round((correct / total) * 100);
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{COG_LABEL[type] || type}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: pct >= 70 ? '#16A34A' : pct >= 50 ? 'var(--cobalt)' : 'var(--danger)' }}>
                          {correct}/{total} ({pct}%)
                        </span>
                      </div>
                      <ProgressBar value={pct} height={6} color={COG_COLOR[type] || 'var(--muted)'} />
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Strength / Gap Matrix */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 4 }}>Topic Mastery Map</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 16 }}>Sorted by exam weight — gaps in high-weight topics are critical</p>
          {matrix.length === 0 ? (
            <p className="note">Topic mastery will appear after quizzing.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matrix.map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: t.tier === 'strong' ? '#16A34A' : t.tier === 'shaky' ? 'var(--tangerine)' : 'var(--danger)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 6 }}>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{t.weight}% exam</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.tier === 'strong' ? '#16A34A' : t.tier === 'shaky' ? 'var(--tangerine)' : 'var(--danger)' }}>
                          {t.mastery}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${t.mastery}%`, background: t.tier === 'strong' ? '#16A34A' : t.tier === 'shaky' ? 'var(--tangerine)' : 'var(--danger)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {matrix.length > 0 && (
            <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              {[{ colour: '#16A34A', label: 'Strong ≥70%' }, { colour: 'var(--tangerine)', label: 'Shaky 40–69%' }, { colour: 'var(--danger)', label: 'Gap <40%' }].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.colour }} />
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 3: Response Telemetry Insights ── */}
      <Card padding="lg">
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 4 }}>Response Telemetry Insights</h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 20 }}>
          What your answer behaviour tells us — beyond just right or wrong
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {[
            {
              icon: '⏱️',
              title: 'Avg Response Speed',
              value: fmtTime(telemetry.avgLatency),
              detail: telemetry.avgLatency < 5000
                ? 'Fast — you are confident and decisive.'
                : telemetry.avgLatency < 12000
                ? 'Moderate — healthy deliberation time.'
                : 'Slow — may indicate uncertainty or overthinking.',
              flag: telemetry.avgLatency > 15000,
            },
            {
              icon: '🎲',
              title: 'Estimated Guess Rate',
              value: `${telemetry.guessRate}%`,
              detail: telemetry.guessRate <= 10
                ? 'Very low — you rarely guess. High confidence in your answers.'
                : telemetry.guessRate <= 25
                ? 'Moderate — some guessing under uncertainty.'
                : 'High — answering quickly without engagement on many questions. Review low-latency wrong answers.',
              flag: telemetry.guessRate > 25,
            },
            {
              icon: '🎯',
              title: 'Accuracy Rate',
              value: `${telemetry.accuracy}%`,
              detail: telemetry.accuracy >= 80
                ? 'Excellent — strong command of the material.'
                : telemetry.accuracy >= 60
                ? 'Good — solidifying understanding across topics.'
                : telemetry.accuracy >= 45
                ? 'Building — still developing mastery. Stay consistent.'
                : 'Low — revisit fundamentals before advancing.',
              flag: telemetry.accuracy < 45,
            },
            {
              icon: '🧠',
              title: 'Cognitive Profile Match',
              value: profile ? `CWA: ${profile.cwa ?? '—'}%` : 'N/A',
              detail: profile
                ? `${profile.programme || 'Programme not set'} · Level ${profile.level || '?'}. Your academic track record and cognitive constructs are factored into your readiness estimate.`
                : 'Complete your profile for personalised insights.',
              flag: false,
            },
          ].map(card => (
            <div key={card.title} style={{
              padding: 16,
              background: card.flag ? '#FEF2F2' : 'var(--surface)',
              border: `1px solid ${card.flag ? '#FECACA' : 'var(--line)'}`,
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 900, color: card.flag ? 'var(--danger)' : 'var(--cobalt)', marginBottom: 8, lineHeight: 1 }}>
                {card.value}
              </div>
              <p style={{ fontSize: 11, color: card.flag ? '#7F1D1D' : 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{card.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Row 4: Deep Intelligence Synthesis ── */}
      <div style={{ marginTop: 40, marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-display)', margin: 0 }}>Deep Psychological Synthesis</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 4, margin: 0 }}>The AI engine discovers the hidden "why" behind your readiness score</p>
          </div>
          <button
            onClick={fetchInsights}
            disabled={loadingInsights}
            style={{ padding: '12px 24px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', background: 'var(--magenta)', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 800, cursor: loadingInsights ? 'not-allowed' : 'pointer', opacity: loadingInsights ? 0.7 : 1, boxShadow: '0 4px 0 var(--ink)', transition: 'all 0.2s', flexShrink: 0 }}
          >
            {loadingInsights ? 'Crunching 25 Vectors...' : 'Unlock Deep Intelligence ⚡'}
          </button>
        </div>

        {insights.length > 0 ? (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {insights.map((insight, idx) => {
              const colorMap = {
                positive: 'var(--green)',
                warning: 'var(--tangerine)',
                critical: 'var(--magenta)'
              };
              const bgMap = {
                positive: 'rgba(52,211,153,0.05)',
                warning: 'rgba(251,146,60,0.05)',
                critical: 'rgba(236,72,153,0.05)'
              };
              const accent = colorMap[insight.status as keyof typeof colorMap] || 'var(--cobalt)';
              const bg = bgMap[insight.status as keyof typeof bgMap] || 'var(--surface)';

              return (
                <div key={idx} className="card hover-lift" style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderTop: `4px solid ${accent}`,
                  background: bg,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0, fontWeight: 800, color: accent }}>
                      {insight.title}
                    </h3>
                    <div style={{ 
                      width: 8, height: 8, borderRadius: '50%', background: accent,
                      boxShadow: `0 0 8px ${accent}`
                    }} />
                  </div>
                  
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {insight.insight}
                  </div>
                  
                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'flex', gap: '8px' }}>
                    <span style={{ color: accent, flexShrink: 0 }}>💡</span> 
                    <span>{insight.action}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '40px', border: '1.5px dashed var(--line)', borderRadius: 16, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)' }}>
            Click "Unlock Deep Intelligence" to generate a massive, 25-card behavioral analysis of your exam preparedness.
          </div>
        )}
      </div>
    </div>
  );
}
