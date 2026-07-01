'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SkillRadar from '@/components/ui/SkillRadar';
import ExecutiveReport from '@/components/ui/ExecutiveReport';
import { ConfidenceBand } from '@/components/ui/ProgressBar';

// ─── Helpers ────────────────────────────────────────────────────────────────
function scoreLabel(val: number): { label: string; color: string } {
  if (val >= 80) return { label: 'Excellent', color: 'var(--green)' };
  if (val >= 65) return { label: 'Strong', color: 'var(--cobalt)' };
  if (val >= 45) return { label: 'Developing', color: 'var(--tangerine)' };
  return { label: 'Needs focus', color: 'var(--magenta)' };
}

const CONSTRUCT_META: Record<string, { icon: string; label: string; description: string; testName: string }> = {
  working_memory:       { icon: '🧠', label: 'Working Memory',       description: 'Ability to hold and manipulate information in short-term memory', testName: 'Test 1 — Working Memory' },
  processing_speed:     { icon: '⚡', label: 'Processing Speed',     description: 'How quickly you can respond accurately under timed conditions',   testName: 'Test 2 — Processing Speed' },
  sustained_attention:  { icon: '🎯', label: 'Sustained Attention',  description: 'Ability to maintain focus, vigilance, and impulse control',       testName: 'Test 3 — Sustained Attention' },
  logical_reasoning:    { icon: '🔗', label: 'Logical Reasoning',    description: 'Ability to apply deductive and inductive reasoning to rules',     testName: 'Test 4 — Logical Reasoning' },
  analytical_reasoning: { icon: '📊', label: 'Analytical Reasoning', description: 'Pattern recognition, spatial reasoning, and data interpretation', testName: 'Test 5 — Analytical Reasoning' },
  metacognition:        { icon: '🪞', label: 'Metacognition',        description: 'Self-awareness and calibration of one\'s own knowledge',          testName: 'Test 6 — Metacognitive Calibration' },
};

// ─── Score bar ───────────────────────────────────────────────────────────────
function ScoreBar({ value, ciLow, ciHigh, color }: { value: number; ciLow: number; ciHigh: number; color: string }) {
  return (
    <div style={{ position: 'relative', height: 10, borderRadius: 99, background: 'var(--line)', overflow: 'visible', marginTop: 6 }}>
      {/* CI band */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${ciLow}%`, width: `${ciHigh - ciLow}%`,
        background: color, opacity: 0.2, borderRadius: 99,
      }} />
      {/* Point */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: 0, width: `${value}%`,
        background: color, borderRadius: 99,
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
      {/* Thumb */}
      <div style={{
        position: 'absolute', top: '50%', left: `${value}%`,
        transform: 'translate(-50%, -50%)',
        width: 14, height: 14, borderRadius: '50%',
        background: color, border: '2px solid var(--ink)',
        boxShadow: '0 2px 0 var(--ink)',
      }} />
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile]       = useState<any>(null);
  const [constructs, setConstructs] = useState<any[]>([]);
  const [telemetry, setTelemetry]   = useState<any[]>([]);
  const [sessions, setSessions]     = useState<any[]>([]);
  const [user, setUser]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const isAssessed = (c: any) => {
    if (!c) return false;
    const ciWidth = (Number(c.ci_high) || 85) - (Number(c.ci_low) || 15);
    return c.measured === true && ciWidth < 65;
  };

  const fetchReport = async (currentProfile: any, currentConstructs: any[], currentTelemetry: any[], currentSessions: any[]) => {
    setLoadingReport(true);
    try {
      const res = await fetch('/api/analyze-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: currentProfile,
          constructs: currentConstructs.filter(c => isAssessed(c)),
          telemetry: currentTelemetry,
          sessions: currentSessions,
          wassceCourse: currentProfile?.wassce_course,
          wassceGrades: currentProfile?.wassce_grades,
          ageBand: currentProfile?.age_band,
          university: currentProfile?.university,
        })
      });
      const data = await res.json();
      if (data.analysis) {
        // Handle case where API returns a stringified JSON instead of raw JSON
        if (typeof data.analysis === 'string') {
          try {
            setReport(JSON.parse(data.analysis));
          } catch(e) {
            console.error('Failed to parse AI JSON', e);
          }
        } else {
          setReport(data.analysis);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // 1. Auth user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      console.log('[Profile] user id:', user.id);

      // 2. Profile row
      const { data: prof, error: profErr } = await (supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() as any);
      console.log('[Profile] profiles row:', prof, profErr);
      setProfile(prof ?? null);

      // 3. Learner constructs
      const { data: constr, error: constrErr } = await (supabase
        .from('learner_constructs')
        .select('*')
        .eq('user_id', user.id) as any);
      console.log('[Profile] constructs:', constr, constrErr);

      // Deduplication strategy:
      // 1. Prefer rows with measured=true over uninitialised rows
      // 2. Among same measured-status rows, keep the latest
      const raw: any[] = (constr as any[]) || [];
      const latest = new Map<string, any>();
      raw.forEach(c => {
        const existing = latest.get(c.construct);
        if (!existing) {
          latest.set(c.construct, c);
        } else if (c.measured && !existing.measured) {
          // Real measurement beats a baseline init — always prefer it
          latest.set(c.construct, c);
        } else if (!c.measured && existing.measured) {
          // Keep the measured one
        } else {
          // Same measured status — keep the latest by timestamp
          if (new Date(c.created_at) > new Date(existing.created_at)) {
            latest.set(c.construct, c);
          }
        }
      });
      setConstructs(Array.from(latest.values()));

      // 4. Telemetry (response_events)
      const { data: respEvents } = await (supabase
        .from('response_events')
        .select(`
          latency_ms,
          is_correct,
          stated_confidence,
          flags,
          items (
            cognitive_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as any);
      setTelemetry(respEvents || []);

      // 5. Quiz Sessions
      const { data: sess } = await (supabase
        .from('quiz_sessions')
        .select('timed, theta_final, se_final, started_at, ended_at')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10) as any);
      setSessions(sess || []);

      setLoading(false);
    };
    load();
  }, [router]);

  // Build a map of construct key → DB row (best row per construct)
  const constructMap = new Map(constructs.map(c => [c.construct, c]));


  const assessedCount = Object.keys(CONSTRUCT_META).filter(key => isAssessed(constructMap.get(key))).length;
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 700, margin: '0 auto' }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 20 }} />)}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto', overflow: 'hidden' }}>

      {/* ─── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Learner Profile</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            MY <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>Profile</span>
          </h1>
        </div>
      </div>

      {/* ─── Identity card ──────────────────────────────── */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--navy)', border: '3px solid var(--ink)',
          boxShadow: '0 4px 0 var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{user?.email?.split('@')[0] || 'Student'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile?.programme && (
              <span style={{ background: 'var(--lime)', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', padding: '2px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {profile.programme}
              </span>
            )}
            {profile?.level && (
              <span style={{ background: 'var(--cobalt-soft)', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', padding: '2px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--cobalt-ink)' }}>
                Level {profile.level}
              </span>
            )}
            {profile?.age_band && (
              <span style={{ background: 'var(--surface)', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', padding: '2px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Age {profile.age_band}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── WASSCE Background ──────────────────────────── */}
      {profile?.wassce_course && (
        <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, fontWeight: 700 }}>
            📋 WASSCE Background
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--cobalt-ink)' }}>{profile.wassce_course}</div>
          {profile?.wassce_grades && Object.keys(profile.wassce_grades).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {Object.entries(profile.wassce_grades as Record<string, string>).map(([subject, grade]) => {
                const gradeNum = { A1: 1, B2: 2, B3: 3, C4: 4, C5: 5, C6: 6, D7: 7, E8: 8, F9: 9 }[grade] || 9;
                const gradeColor = gradeNum <= 3 ? 'var(--green)' : gradeNum <= 6 ? 'var(--tangerine)' : 'var(--magenta)';
                return (
                  <div key={subject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1.5px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{subject}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13, color: gradeColor, marginLeft: 8, flexShrink: 0 }}>{grade}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Cognitive Profile ──────────────────────────── */}
      {assessedCount > 0 ? (
        <div className="hero" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow" style={{ color: 'var(--lime)', margin: 0 }}>Learner profile · v1 — 6 dimensions</div>
            <button
              onClick={() => router.push('/onboarding?retake=tests')}
              style={{ padding: '6px 12px', border: '1.5px solid var(--ink)', borderRadius: 'var(--pill)', background: 'var(--lime)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Retake / Complete →
            </button>
          </div>
          <div className="hero-grid">
            <div>
              {Object.entries(CONSTRUCT_META).map(([key, meta]) => {
                const row = constructMap.get(key);
                const val  = Math.round(Number(row?.value) || 50);
                const low  = row?.ci_low  !== null && row?.ci_low !== undefined ? Math.round(Number(row.ci_low))  : Math.max(0, val - 15);
                const high = row?.ci_high !== null && row?.ci_high !== undefined ? Math.round(Number(row.ci_high)) : Math.min(100, val + 15);
                
                // Get the mapped color from the dimension if possible, or fallback to the score color
                let color = scoreLabel(val).color;
                if (key === 'working_memory') color = 'var(--lime)';
                if (key === 'processing_speed') color = 'var(--tangerine)';
                if (key === 'sustained_attention') color = 'var(--cobalt)';
                if (key === 'logical_reasoning') color = 'var(--magenta)';
                if (key === 'analytical_reasoning') color = 'var(--green)';
                if (key === 'metacognition') color = '#8B5CF6';

                return (
                  <ConfidenceBand
                    key={key}
                    point={val}
                    ciLow={low}
                    ciHigh={high}
                    label={meta.label}
                    confidenceLabel={isAssessed(row) ? `Measured` : 'Estimated (skipped)'}
                    color={color}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <SkillRadar
                skills={Object.keys(CONSTRUCT_META).map(key => {
                  const row = constructMap.get(key);
                  return {
                    name: CONSTRUCT_META[key].label.split(' ')[0], // Using short name like Memory, Speed, etc.
                    value: isAssessed(row) ? Math.round(Number(row?.value) || 0) : 50,
                  };
                })}
                size={250}
              />
              <span className="mono note" style={{ color: 'var(--muted-ink)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '8px' }}>
                Cognitive baseline · 6 axes
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4, fontWeight: 700 }}>
                🧠 Cognitive Profile
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {assessedCount} of {Object.keys(CONSTRUCT_META).length} dimensions assessed
              </div>
            </div>
            <button
              onClick={() => router.push('/onboarding?retake=tests')}
              style={{ padding: '8px 16px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)', background: 'var(--lime)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}
            >
              Take assessment →
            </button>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
            Take your cognitive assessment to unlock your profile radar.
          </div>
        </div>
      )}

      {/* ─── Deep Qualitative Synthesis ─────────────────── */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', textTransform: 'uppercase', margin: 0 }}>Deep Profile Synthesis</h2>
          <button
            onClick={() => fetchReport(profile, constructs, telemetry, sessions)}
            disabled={loadingReport}
            style={{ padding: '8px 16px', border: '1.5px solid var(--ink)', borderRadius: 'var(--pill)', background: 'var(--paper-2)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, cursor: loadingReport ? 'not-allowed' : 'pointer', opacity: loadingReport ? 0.7 : 1 }}
          >
            {loadingReport ? 'Synthesizing...' : 'Analyze My Data ⚡'}
          </button>
        </div>
        
        {report ? (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {Object.entries(report).map(([key, data]: [string, any]) => {
              // Status colors
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
              const accent = colorMap[data.status as keyof typeof colorMap] || 'var(--cobalt)';
              const bg = bgMap[data.status as keyof typeof bgMap] || 'var(--surface)';
              
              return (
                <div key={key} className="card hover-lift" style={{ 
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
                      {data.title}
                    </h3>
                    <div style={{ 
                      width: 8, height: 8, borderRadius: '50%', background: accent,
                      boxShadow: `0 0 8px ${accent}`
                    }} />
                  </div>
                  
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {data.simple_insight}
                  </div>
                  
                  <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '13px', color: 'var(--muted)', fontWeight: 500, display: 'flex', gap: '8px' }}>
                    <span style={{ color: accent, flexShrink: 0 }}>💡</span> 
                    <span>{data.actionable_advice}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '30px', border: '1.5px dashed var(--line)', borderRadius: 16, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)' }}>
            Click "Analyze My Data" to generate a deep, AI-driven qualitative synthesis of your cognitive profile, WASSCE background, and learning challenges.
          </div>
        )}
      </div>

      {/* ─── CWA ────────────────────────────────────────── */}
      {profile?.cwa !== null && profile?.cwa !== undefined && (
        <div className="card" style={{ padding: '20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontWeight: 700 }}>📈 Current Weighted Average</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Your self-reported university GPA (0–100 scale)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', textTransform: 'uppercase', lineHeight: 1 }}>{profile.cwa}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginTop: 4 }}>CWA</div>
          </div>
        </div>
      )}

      {/* ─── Footer action ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/onboarding?step=4')}
          style={{ flex: 1, padding: '14px 24px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--paper-2)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 var(--ink)' }}
        >
          See my initial test results
        </button>
        <button
          onClick={() => router.back()}
          style={{ flex: 1, padding: '14px 24px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--paper)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 var(--ink)' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
