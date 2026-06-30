'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Badge, { Sparkle } from '@/components/ui/Badge';
import { ConfidenceBand } from '@/components/ui/ProgressBar';
import { createClient } from '@/lib/supabase/client';

/** Course dashboard — the learning pipeline hub */
export default function CourseDashboardPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>({ point: 50, ciLow: 15, ciHigh: 85, label: 'No estimates yet' });
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourseStats = async () => {
      if (!courseId) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch course details
        const { data: courseData, error: courseError } = await (supabase
          .from('courses') as any)
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        const examDateVal = courseData.exam_date
          ? new Date(courseData.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Not set';

        const daysLeft = courseData.exam_date
          ? Math.max(0, Math.ceil((new Date(courseData.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : 0;

        const dbCourse = {
          name: courseData.name,
          code: courseData.name.slice(0, 8).toUpperCase(),
          status: courseData.status,
          difficulty: courseData.self_difficulty || 5,
          examDate: examDateVal,
          daysUntilExam: daysLeft,
        };
        setCourse(dbCourse);

        // 2. Fetch readiness estimate
        const { data: readinessData } = await supabase
          .from('readiness_estimates')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestReadiness = readinessData?.[0] as any;
        const readinessRangeStr = latestReadiness
          ? `${Math.round(latestReadiness.ci_low)}–${Math.round(latestReadiness.ci_high)}%`
          : '30–80%';

        const readinessObj = latestReadiness
          ? {
              point: Math.round(latestReadiness.point),
              ciLow: Math.round(latestReadiness.ci_low),
              ciHigh: Math.round(latestReadiness.ci_high),
              label: latestReadiness.confidence_label ? latestReadiness.confidence_label.replace('_', ' ') : 'Moderate confidence'
            }
          : {
              point: 50,
              ciLow: 30,
              ciHigh: 80,
              label: 'Cold start baseline'
            };
        setReadiness(readinessObj);

        // 3. Count content units and tested units
        const { data: units } = await supabase
          .from('content_units')
          .select('id')
          .eq('course_id', courseId);
        const totalUnits = units?.length || 0;

        const { data: responseEvents } = await supabase
          .from('response_events')
          .select('*, items(*)')
          .eq('user_id', user.id);

        const courseEvents = (responseEvents as any || []).filter((e: any) => e.items && e.items.course_id === courseId);
        const uniqueTestedUnits = new Set(courseEvents.map((e: any) => e.items?.content_unit_id).filter(Boolean));
        const coverageProp = totalUnits > 0 ? (uniqueTestedUnits.size / totalUnits) : 0;
        const coveragePercent = Math.round(coverageProp * 100);

        // 4. Count quiz items
        const { count: itemsCount } = await (supabase.from('items') as any)
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('status', 'live');

        // 5. Count reviews due
        const { data: reviews } = await supabase
          .from('review_schedule')
          .select('*')
          .eq('course_id', courseId);

        const nowStr = new Date().toISOString();
        const reviewsDueCount = (reviews as any || []).filter((r: any) => r.due_at <= nowStr).length;

        // Populate stats array
        const dynamicStats = [
          { label: 'Readiness', value: readinessRangeStr, sublabel: readinessObj.label, color: latestReadiness ? 'var(--cobalt)' : 'var(--tangerine)', icon: '📊' },
          { label: 'Topics', value: `${uniqueTestedUnits.size} / ${totalUnits}`, sublabel: `${coveragePercent}% coverage`, color: 'var(--cobalt)', icon: '📚' },
          { label: 'Quiz Items', value: String(itemsCount || 0), sublabel: 'Validated & live', color: 'var(--green)', icon: '🎯' },
          { label: 'Reviews Due', value: String(reviewsDueCount), sublabel: 'Overdue or active', color: reviewsDueCount > 0 ? 'var(--magenta)' : 'var(--muted)', icon: '🔁' },
        ];
        setStats(dynamicStats);

        // 6. Check pipelines statuses
        const isAnalysisComplete = dbCourse.status === 'ready' || totalUnits > 0;
        const isDiagnosisComplete = latestReadiness !== undefined;
        const isStudyAvailable = totalUnits > 0;
        const isQuizAvailable = (itemsCount || 0) > 0;
        const isResultsAvailable = courseEvents.length > 0;
        const isOutcomeAvailable = courseEvents.length > 0;

        const dynamicStages = [
          { href: `analysis`, label: 'Course Intelligence', icon: '🗂️', status: isAnalysisComplete ? 'complete' : 'available', description: `${totalUnits} topics mapped`, accentColor: 'var(--cobalt)' },
          { href: `diagnosis`, label: 'Cold Diagnosis', icon: '🔍', status: isDiagnosisComplete ? 'complete' : isAnalysisComplete ? 'available' : 'locked', description: `Readiness range: ${readinessRangeStr}`, accentColor: 'var(--magenta)' },
          { href: `study`, label: 'Study Room', icon: '📖', status: isStudyAvailable ? 'available' : 'locked', description: `5 depth levels across ${totalUnits} topics`, accentColor: 'var(--tangerine)' },
          { href: `quiz`, label: 'Adaptive Quiz', icon: '🎯', status: isQuizAvailable ? 'available' : 'locked', description: `${itemsCount || 0} items with CAT selection`, accentColor: 'var(--cobalt)' },
          { href: `results`, label: 'Results & Analysis', icon: '📊', status: isResultsAvailable ? 'available' : 'locked', description: 'Complete a quiz to see results', accentColor: 'var(--green)' },
          { href: `outcome`, label: 'Outcome Loop', icon: '🏆', status: isOutcomeAvailable ? 'available' : 'locked', description: 'Report your exam grade for recalibration', accentColor: 'var(--lime)' },
        ];
        setStages(dynamicStages);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseStats();
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="skeleton" style={{ height: '140px', borderRadius: 'var(--r)' }} />
        <div className="responsive-grid-4" style={{ gap: '16px' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '120px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ── Hero header ── */}
      <div className="hero" style={{ marginBottom: '28px', padding: '34px' }}>
        <div className="hero-grid" style={{ gridTemplateColumns: '1fr', gap: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'var(--lime)', border: '2px solid var(--ink)', borderRadius: 'var(--pill)',
                padding: '4px 14px', fontFamily: 'var(--font-mono)', fontSize: '10px',
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: '0 2px 0 var(--ink)', color: 'var(--ink)',
              }}>
                {course.code}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted-ink)' }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: course.status === 'ready' ? 'var(--green)' : 'var(--tangerine)',
                  boxShadow: `0 0 6px ${course.status === 'ready' ? 'var(--green)' : 'var(--tangerine)'}`,
                }} />
                {course.status === 'ready' ? 'Active' : 'Processing'}
              </div>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)',
              textTransform: 'uppercase', lineHeight: 1.05, margin: '0 0 8px',
              letterSpacing: '0.01em', color: '#fff',
            }}>
              {course.name.split(' ').slice(0, -1).join(' ')}{' '}
              <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--lime)', fontSize: '1.1em' }}>
                {course.name.split(' ').slice(-1)[0]}
              </span>
            </h1>

            <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--muted-ink)', fontFamily: 'var(--font-body)', fontWeight: 500, marginTop: '8px' }}>
              <span>📅 Exam: <strong style={{ color: '#fff' }}>{course.examDate}</strong></span>
              <span style={{
                color: course.daysUntilExam <= 30 ? 'var(--tangerine)' : 'var(--muted-ink)',
                fontWeight: course.daysUntilExam <= 30 ? 700 : 500,
              }}>
                ⏳ {course.daysUntilExam} days left
              </span>
              <span>Difficulty: <strong style={{ color: '#fff' }}>{course.difficulty}/10</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="responsive-grid-4" style={{ gap: '14px', marginBottom: '28px' }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--paper-2)', border: '2px solid var(--ink)',
            borderRadius: 'var(--r)', padding: '22px', textAlign: 'center',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)',
            }}>
              {stat.label}
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)',
              fontWeight: 700, color: stat.color, marginTop: '6px',
            }}>
              {stat.value}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontWeight: 500 }}>
              {stat.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* ── Readiness band ── */}
      <div style={{
        background: 'var(--paper-2)', border: '2px solid var(--ink)',
        borderRadius: 'var(--r)', padding: '26px', marginBottom: '28px',
        boxShadow: 'var(--shadow)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
          color: 'var(--cobalt)', textTransform: 'uppercase', letterSpacing: '0.12em',
          marginBottom: '16px',
        }}>
          Current Readiness Estimate
        </h3>
        <ConfidenceBand
          point={readiness.point}
          ciLow={readiness.ciLow}
          ciHigh={readiness.ciHigh}
          label="Overall Readiness"
          confidenceLabel={readiness.label}
          color="var(--cobalt)"
        />
      </div>

      {/* ── Learning Pipeline ── */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Sparkle size={18} color="var(--magenta)" />
          LEARNING{' '}
          <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)', fontSize: '1.15em' }}>
            pipeline
          </span>
        </h2>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
          color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {stages.filter(s => s.status === 'complete').length} / {stages.length} complete
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {stages.map((stage, index) => {
          const isLocked = stage.status === 'locked';
          const isComplete = stage.status === 'complete';

          return (
            <Link
              key={stage.href}
              href={isLocked ? '#' : `/courses/${courseId}/${stage.href}`}
              style={{ textDecoration: 'none', color: 'inherit', pointerEvents: isLocked ? 'none' : 'auto' }}
            >
              <div style={{
                background: 'var(--paper-2)',
                border: '2px solid var(--ink)',
                borderRadius: 'var(--r-sm)',
                padding: '18px 22px',
                opacity: isLocked ? 0.45 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: isLocked ? 'default' : 'pointer',
                boxShadow: isComplete ? 'none' : 'var(--shadow)',
                borderLeft: isComplete
                  ? '5px solid var(--green)'
                  : `5px solid ${stage.accentColor}`,
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
                onMouseEnter={e => {
                  if (isLocked) return;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hard)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = isComplete ? 'none' : 'var(--shadow)';
                }}
              >
                {/* Step number */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: isComplete ? 'var(--green)' : stage.accentColor,
                  border: '2px solid var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700,
                  color: '#fff', flexShrink: 0,
                  boxShadow: isComplete ? 'none' : '0 2px 0 var(--ink)',
                }}>
                  {isComplete ? '✓' : index + 1}
                </div>

                {/* Icon */}
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{stage.icon}</span>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontFamily: 'var(--font-body)', fontSize: '14px',
                    fontWeight: 800, marginBottom: '2px', color: 'var(--ink)',
                  }}>
                    {stage.label}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4, fontWeight: 500 }}>
                    {stage.description}
                  </p>
                </div>

                {/* Status badge */}
                <Badge
                  variant={isComplete ? 'green' : isLocked ? 'muted' : 'cobalt'}
                  size="sm"
                >
                  {isComplete ? '✓ Done' : isLocked ? '🔒 Locked' : 'Enter →'}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Calibration link ── */}
      {course.status === 'ready' && (
        <div style={{
          background: 'var(--paper-2)', border: '2px solid var(--ink)',
          borderRadius: 'var(--r)', padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: 'var(--shadow)',
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '14px',
              color: 'var(--cobalt)', marginBottom: '4px',
            }}>
              Calibration Dashboard
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
              View Predicted-vs-Actual calibration and adjust item difficulty.
            </p>
          </div>
          <Link href={`/courses/${courseId}/calibration`}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--cobalt)', border: '2px solid var(--ink)',
              borderRadius: 'var(--pill)', padding: '8px 18px',
              fontSize: '12px', fontWeight: 800, color: '#fff',
              boxShadow: '0 3px 0 var(--ink)', cursor: 'pointer',
              transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            }}>
              Open →
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
