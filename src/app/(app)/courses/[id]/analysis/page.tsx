'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge, { Sparkle } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import ExecutiveReport from '@/components/ui/ExecutiveReport';

// ─── helpers ─────────────────────────────────────────────────────────────────

const COG_COLOR: Record<string, string> = {
  maths:               'var(--magenta)',
  application:         'var(--cobalt)',
  recall:              'var(--tangerine)',
  comprehension:       '#0891B2',
  analysis:            '#7C3AED',
  evaluation:          'var(--lime)',
  synthesis:           '#059669',
  procedural:          '#DC2626',
  data_interpretation: '#D97706',
};

const COG_LABEL: Record<string, string> = {
  recall:              'Recall',
  comprehension:       'Comprehension',
  application:         'Application',
  analysis:            'Analysis',
  evaluation:          'Evaluation',
  synthesis:           'Synthesis',
  maths:               'Maths',
  procedural:          'Procedural',
  data_interpretation: 'Data Interpretation',
};

// Skills each cognitive dimension demands from the student
const COG_SKILL: Record<string, string> = {
  recall:              'Long-term memory retention of facts, formulas, and definitions',
  comprehension:       'Conceptual understanding — ability to explain ideas in own words',
  application:         'Scenario-based problem solving in novel, unseen contexts',
  analysis:            'Critical thinking — breaking down systems and identifying relationships',
  evaluation:          'Evidence-based argumentation and judgement under uncertainty',
  synthesis:           'Creative problem-solving, experimental design, and formulation',
  maths:               'Numerical reasoning, algebraic manipulation, and quantitative analysis',
  procedural:          'Step-by-step execution of laboratory, clinical, or technical procedures',
  data_interpretation: 'Statistical and graphical data reading without calculation',
};

// Which student construct is most relevant to each cognitive dimension
const COG_CONSTRUCT: Record<string, string> = {
  recall:              'working_memory',
  comprehension:       'working_memory',
  application:         'executive_function',
  analysis:            'working_memory',
  evaluation:          'metacognition',
  synthesis:           'executive_function',
  maths:               'processing_speed',
  procedural:          'processing_speed',
  data_interpretation: 'working_memory',
};

function scoreLabel(score: number): { text: string; colour: string } {
  if (score >= 70) return { text: 'Strong', colour: 'var(--lime)' };
  if (score >= 50) return { text: 'Adequate', colour: 'var(--cobalt)' };
  if (score >= 35) return { text: 'Developing', colour: 'var(--tangerine)' };
  return { text: 'Needs work', colour: 'var(--danger)' };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [topics, setTopics] = useState<any[]>([]);
  const [cognitiveEmphasis, setCognitiveEmphasis] = useState<Record<string, number>>({
    recall: 0, comprehension: 0, application: 0, analysis: 0,
    evaluation: 0, synthesis: 0, maths: 0, procedural: 0, data_interpretation: 0,
  });
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [constructs, setConstructs] = useState<Record<string, number>>({});
  const [courseObj, setCourseObj] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'analyzing' | 'ready' | 'error'>('loading');
  
  // AI Report State
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const analysisTriggeredRef = React.useRef(false); // guard against React double-invoke

  const fetchReport = async () => {
    try {
      setLoadingReport(true);
      const res = await fetch('/api/analyze-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: courseObj,
          topics,
          prerequisites,
          cognitiveEmphasis,
          profile,
          constructs
        })
      });
      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      setReport(data.analysis);
    } catch (e) {
      console.error(e);
      alert('Failed to generate course intelligence analysis.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!courseId) return;
      try {
        const supabase = createClient();

        // 0. Auth + course status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: course, error: courseError } = await (supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single() as any);

        if (courseError) throw courseError;
        setCourseObj(course);

        if (course.status === 'analyzing') {
          // Guard against double-invocation (React strict mode / fast refresh)
          if (analysisTriggeredRef.current) return;
          analysisTriggeredRef.current = true;

          setStatus('analyzing');
          try {
            const res = await fetch(`/api/courses/${courseId}/analyze`, {
              method: 'POST',
            });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              console.error('[analysis] analyze API error:', errBody);
              setStatus('error');
              analysisTriggeredRef.current = false;
              return;
            }
          } catch (fetchErr) {
            console.error('[analysis] fetch failed:', fetchErr);
            setStatus('error');
            analysisTriggeredRef.current = false;
            return;
          }
          // Analysis done — reset guard and re-fetch data
          analysisTriggeredRef.current = false;
          await fetchAll();
          return;
        }
        if (course.status === 'error') { setStatus('error'); return; }

        // 1. Content units
        const { data: dbUnits, error: unitsError } = await supabase
          .from('content_units')
          .select('*')
          .eq('course_id', courseId)
          .order('ordered_index', { ascending: true });
        if (unitsError) throw unitsError;

        // 2. Prerequisites
        const { data: dbPrereqs } = await supabase
          .from('prerequisites')
          .select('*')
          .eq('course_id', courseId);

        // 3. Student profile
        const { data: profileData } = await (supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single() as any);

        // 4. Cognitive constructs
        const { data: constructData } = await (supabase
          .from('learner_constructs')
          .select('construct, value')
          .eq('user_id', user.id) as any);

        // Build construct map: name → value (0–100)
        const constructMap: Record<string, number> = {};
        ((constructData as any[]) || []).forEach((c: any) => {
          constructMap[c.construct] = Number(c.value);
        });
        setConstructs(constructMap);
        setProfile(profileData);

        // 5. Process topics
        const unitsList = (dbUnits as any[]) || [];
        setTopics(unitsList.map((u: any) => ({
          id: u.id,
          name: u.topic,
          subtopics: Array.isArray(u.subtopics) && u.subtopics.length > 0 ? u.subtopics : [],
          weight: Number(u.exam_weight) || 0,
          cogEmphasis: u.cognitive_emphasis || {},
        })));

        // 6. Average cognitive emphasis
        if (unitsList.length > 0) {
          const sum: Record<string, number> = { recall: 0, comprehension: 0, application: 0, analysis: 0, evaluation: 0, synthesis: 0, maths: 0, procedural: 0, data_interpretation: 0 };
          unitsList.forEach((u: any) => {
            const e = u.cognitive_emphasis || {};
            Object.keys(sum).forEach(k => { sum[k] += Number(e[k]) || 0; });
          });
          const n = unitsList.length;
          const raw: Record<string, number> = {};
          Object.keys(sum).forEach(k => { raw[k] = Math.round(sum[k] / n); });

          // Re-normalise
          const total = Object.values(raw).reduce((s, v) => s + v, 0);
          if (total > 0) {
            const factor = 100 / total;
            const keys = Object.keys(raw);
            let running = 0;
            keys.forEach((k, i) => {
              if (i === keys.length - 1) raw[k] = Math.round(100 - running);
              else { raw[k] = Math.round(raw[k] * factor); running += raw[k]; }
            });
          }
          setCognitiveEmphasis(raw);
        }

        // 7. Prerequisites
        setPrerequisites(((dbPrereqs as any[]) || []).map((p: any) => ({ from: p.from_topic, to: p.to_topic })));

        setStatus('ready');
      } catch (err) {
        console.error('[analysis page]', err);
        setStatus('error');
      }
    };
    fetchAll();
  }, [courseId]);

  // ── Derived diagnostics ─────────────────────────────────────────────────────

  const topN = Object.entries(cognitiveEmphasis)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  // Estimated hours — personalised formula
  const estHours = (() => {
    if (topics.length === 0) return null;
    const basePerTopic = 4; // hrs
    let multiplier = 1.0;

    // Course complexity adjustments
    if ((cognitiveEmphasis.maths || 0) > 30)               multiplier *= 1.30;
    if ((cognitiveEmphasis.synthesis || 0) > 20)           multiplier *= 1.20;
    if ((cognitiveEmphasis.analysis || 0) > 25)            multiplier *= 1.15;
    if ((cognitiveEmphasis.procedural || 0) > 20)          multiplier *= 1.10;

    // Student profile adjustments
    const wm = constructs.working_memory ?? 50;
    const ps = constructs.processing_speed ?? 50;
    const mc = constructs.metacognition ?? 50;
    const cwa = profile?.cwa ?? 55;

    if (wm < 40)   multiplier *= 1.30;
    else if (wm < 55) multiplier *= 1.15;

    if (ps < 40)   multiplier *= 1.25;
    else if (ps < 55) multiplier *= 1.12;

    if (mc > 70)   multiplier *= 0.90;  // self-regulators need less time

    if (cwa >= 70) multiplier *= 0.88;
    else if (cwa < 50) multiplier *= 1.18;

    const total = Math.round(topics.length * basePerTopic * multiplier);
    const perWeek = 3; // recommended sessions/week × ~1.5 hrs each
    const weeks = Math.ceil(total / (perWeek * 1.5));
    return { total, perWeek, weeks };
  })();

  // Risk areas — dimensions with high weight but low student construct
  const risks = topN
    .filter(([dim]) => {
      const constructKey = COG_CONSTRUCT[dim];
      if (!constructKey) return false;
      const score = constructs[constructKey];
      if (score === undefined) return false;
      const weight = cognitiveEmphasis[dim] || 0;
      return weight > 15 && score < 50;
    })
    .map(([dim]) => ({
      dim,
      weight: cognitiveEmphasis[dim],
      construct: COG_CONSTRUCT[dim],
      score: constructs[COG_CONSTRUCT[dim]] ?? 0,
    }));

  // Study strategy recommendations based on construct profile
  const strategies: { icon: string; tip: string }[] = [];
  const wm  = constructs.working_memory    ?? 50;
  const ps  = constructs.processing_speed  ?? 50;
  const mc  = constructs.metacognition     ?? 50;
  const ef  = constructs.executive_function ?? 50;

  if (wm < 50)
    strategies.push({ icon: '🧩', tip: 'Break topics into small chunks — your working memory benefits from shorter, focused study sessions (25–30 min) with frequent breaks.' });
  if (ps < 50)
    strategies.push({ icon: '⏱️', tip: 'Give yourself extra time for calculation-heavy questions. Practice maths problems under timed conditions to improve processing fluency.' });
  if (mc >= 65)
    strategies.push({ icon: '📋', tip: 'Your metacognition is strong — use self-quizzing and the Feynman technique frequently. You can self-diagnose gaps better than most students.' });
  else
    strategies.push({ icon: '🔁', tip: 'After each study session, write a 3-sentence summary of what you learned without looking at your notes. This builds metacognitive awareness.' });
  if (ef >= 65)
    strategies.push({ icon: '🗂️', tip: 'Use your executive function strength to create structured study plans and stick to them. Prioritise high-weight topics first.' });
  if ((cognitiveEmphasis.maths || 0) > 25)
    strategies.push({ icon: '🔢', tip: 'This course is quantitative. Work through past paper calculations weekly — not just reading — to build procedural fluency.' });
  if ((cognitiveEmphasis.synthesis || 0) > 15)
    strategies.push({ icon: '🔬', tip: 'Practice design-type questions: "How would you test X?" Sketch experimental designs before reading the answer.' });
  if ((cognitiveEmphasis.evaluation || 0) > 20)
    strategies.push({ icon: '⚖️', tip: 'Train yourself to argue both sides of a question before committing. Evaluation questions reward intellectual honesty, not snap judgements.' });

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton" style={{ height: '40px', width: '200px' }} />
        <div className="skeleton" style={{ height: '300px' }} />
        <div className="skeleton" style={{ height: '200px' }} />
      </div>
    );
  }

  if (status === 'analyzing') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
        <div style={{ fontSize: '4rem', marginBottom: '24px', animation: 'spin 3s linear infinite', display: 'inline-block' }}>⚙️</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', textTransform: 'uppercase', marginBottom: '16px' }}>
          ADWEN IS ANALYZING YOUR MATERIALS
        </h1>
        <p className="lede" style={{ maxWidth: '480px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          We are reading your files, mapping topics, and computing your personalised study forecast.
          This takes about <strong>30–45 seconds</strong> for a typical course.
        </p>
        <div style={{ maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            '📂 Reading uploaded files…',
            '🧠 Extracting topics and subtopics…',
            '⚖️ Mapping cognitive emphasis…',
            '🔗 Building prerequisite graph…',
          ].map((step, i) => (
            <div key={i} style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              fontSize: 13,
              textAlign: 'left',
              color: 'var(--muted)',
              opacity: 0.9,
            }}>{step}</div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>❌</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', textTransform: 'uppercase', marginBottom: '16px', color: 'var(--danger)' }}>
          ANALYSIS FAILED
        </h1>
        <p className="lede" style={{ maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Something went wrong during analysis. Common causes:
        </p>
        <ul style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto 32px', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, listStyle: 'disc', paddingLeft: 24 }}>
          <li>Server configuration issue — contact support</li>
          <li>File too large or encrypted PDF (scanned image)</li>
          <li>Network timeout — the analysis takes ~30–45s</li>
        </ul>
        <Button onClick={async () => {
          // Reset course status to 'analyzing' so the page re-triggers the API call
          const supabase = createClient();
          await (supabase.from('courses') as any).update({ status: 'analyzing' }).eq('id', courseId);
          window.location.reload();
        }}>
          Retry Analysis
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <Badge variant="cobalt" size="sm" style={{ marginBottom: '8px' }}>Stage 3</Badge>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase' }}>
          COURSE{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Intelligence</span>
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '4px' }}>
          Personalised diagnostic — based on your cognitive profile and this course's demands
        </p>
      </div>

      {/* ── Row 1: Cognitive Emphasis + Exam Distribution ── */}
      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Cognitive Emphasis */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkle size={14} /> How This Course Tests You
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            Cognitive demand profile — derived from lecture style and past papers
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topN.map(([type, weight]) => (
              <ProgressBar
                key={type}
                value={weight}
                label={COG_LABEL[type] || type}
                color={COG_COLOR[type] || 'var(--muted)'}
              />
            ))}
          </div>
        </Card>

        {/* Exam Topic Distribution */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
            Exam Topic Distribution
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            Estimated % of exam marks per topic — study heavier topics first
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...topics].sort((a, b) => b.weight - a.weight).map((topic) => (
              <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{topic.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{topic.weight}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${topic.weight}%`, background: 'var(--cobalt)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2: Skill Requirements + Study Forecast ── */}
      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Required Skills */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
            Skills This Course Demands
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            Ranked by how heavily each skill is examined
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topN.slice(0, 6).map(([dim, weight]) => {
              const constructKey = COG_CONSTRUCT[dim];
              const score = constructs[constructKey];
              const lbl = score !== undefined ? scoreLabel(score) : null;
              return (
                <div key={dim} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: COG_COLOR[dim] || 'var(--muted)',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{COG_LABEL[dim]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge variant="cobalt" size="sm">{weight}%</Badge>
                        {lbl && (
                          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: lbl.colour }}>
                            {lbl.text.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                      {COG_SKILL[dim]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Study Forecast */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
            Your Study Forecast
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '20px' }}>
            Estimated based on your cognitive profile, CWA, and this course's complexity
          </p>

          {estHours ? (
            <>
              {/* Big number */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <div style={{ flex: 1, padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 900, color: 'var(--cobalt)', lineHeight: 1 }}>
                    {estHours.total}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>total hours</div>
                </div>
                <div style={{ flex: 1, padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 900, color: 'var(--magenta)', lineHeight: 1 }}>
                    {estHours.weeks}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>weeks to master</div>
                </div>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Topics to cover', value: `${topics.length} topics` },
                  { label: 'Recommended sessions/week', value: `${estHours.perWeek} sessions` },
                  { label: 'Approx. per session', value: `${Math.round(estHours.total / (estHours.weeks * estHours.perWeek))} hrs` },
                  {
                    label: 'Your biggest time factor',
                    value: (wm < 50 || ps < 50)
                      ? 'Cognitive processing — allow extra review time'
                      : (cognitiveEmphasis.maths || 0) > 30
                      ? 'Maths-heavy content — practice regularly'
                      : 'Balanced — standard study pace should work',
                  },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', gap: 8 }}>
                    <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="note">Re-analyse the course to generate your forecast.</p>
          )}
        </Card>
      </div>

      {/* ── Row 3: Risk Areas + Strategies ── */}
      <div className="responsive-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

        {/* Risk Areas */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px', color: risks.length > 0 ? 'var(--danger)' : 'inherit' }}>
            {risks.length > 0 ? '⚠️ Risk Areas' : '✅ No Major Risk Areas'}
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            Dimensions this course emphasises heavily where your profile shows a gap
          </p>
          {risks.length === 0 ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              Your cognitive profile is well-matched to this course's demands. Stay consistent.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {risks.map(r => {
                const lbl = scoreLabel(r.score);
                return (
                  <div key={r.dim} style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: '#991B1B' }}>
                        {COG_LABEL[r.dim]} ({r.weight}% of exam)
                      </span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, color: lbl.colour }}>
                        {r.construct.replace('_', ' ').toUpperCase()}: {Math.round(r.score)}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: '#7F1D1D', margin: 0, lineHeight: 1.5 }}>
                      {COG_SKILL[r.dim]}. Your {r.construct.replace(/_/g, ' ')} score suggests this will require deliberate extra practice.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Study Strategy */}
        <Card padding="lg">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
            Recommended Study Approaches
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            Tailored to your cognitive profile and this course's structure
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {strategies.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{s.tip}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Prerequisite Knowledge ── */}
      {prerequisites.length > 0 && (
        <Card padding="lg" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
            Prerequisite Knowledge Map
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
            You must understand these topics before moving to the next — study them in order
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {prerequisites.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  fontSize: 'var(--text-xs)',
                  maxWidth: '100%',
                }}
              >
                <Badge variant="cobalt" size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>{p.from}</Badge>
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>→</span>
                <Badge variant="tangerine" size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>{p.to}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Topic Quick Reference ── */}
      <Card padding="lg">
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: '4px' }}>
          Topic Overview
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: '16px' }}>
          {topics.length} topics identified — subtopics will appear after re-analysis
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {topics.map((t, i) => (
            <div
              key={t.id}
              style={{
                padding: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>#{i + 1}</span>
                <Badge variant="muted" size="sm">{t.weight}%</Badge>
              </div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>{t.name}</div>
              {t.subtopics.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {t.subtopics.slice(0, 3).map((st: string) => (
                    <span key={st} style={{ fontSize: 9, background: 'var(--line)', borderRadius: 99, padding: '1px 6px', color: 'var(--muted)' }}>{st}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Deep Course Synthesis ─────────────────── */}
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '8px' }}>Deep Course Synthesis</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Our AI analyzes this course's specific demands against your cognitive profile and WASSCE background to give you a highly personalized study strategy.
        </p>

        {!report && !loadingReport && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🧠</div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 8 }}>Ready for Synthesis</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              We'll compare {topics.length} course topics against your 6 cognitive dimensions to predict friction points and formulate a strategy.
            </p>
            <Button onClick={fetchReport} size="lg" variant="primary">
              Analyze Course Intelligence ⚡
            </Button>
          </div>
        )}

        {loadingReport && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
            <div className="spinner" style={{ margin: '0 auto 20px', width: 30, height: 30, border: '3px solid var(--line)', borderTopColor: 'var(--cobalt)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--ink)' }}>Synthesizing Cognitive Friction...</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 8 }}>Cross-referencing course demands with your WASSCE and cognitive profile...</div>
          </div>
        )}

        {report && !loadingReport && (
          <div className="animate-fade-in" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 24 }}>
            <ExecutiveReport markdown={report} />
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button onClick={fetchReport} variant="ghost" size="sm">
                ↻ Regenerate Synthesis
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
