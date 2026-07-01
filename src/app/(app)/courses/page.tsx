'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkle } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

// ── Accent colours per notebook ───────────────────────────────────────────────
const SPINE_COLORS = [
  { bg: 'var(--cobalt)',   text: '#fff',           label: '#ffffffaa' },
  { bg: 'var(--magenta)',  text: '#fff',           label: '#ffffffaa' },
  { bg: 'var(--lime)',     text: 'var(--ink)',     label: 'rgba(0,0,0,0.5)' },
  { bg: 'var(--tangerine)',text: 'var(--ink)',     label: 'rgba(0,0,0,0.5)' },
  { bg: '#7C3AED',         text: '#fff',           label: '#ffffffaa' },
  { bg: '#0891B2',         text: '#fff',           label: '#ffffffaa' },
];

// ── Mastery ring ──────────────────────────────────────────────────────────────
function MasteryRing({ value, size = 52, textColor = 'var(--ink)' }: { value: number; size?: number; textColor?: string }) {
  const sw = 4;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#4ADE80' : value >= 40 ? '#60A5FA' : '#FB923C';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.2)" strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, color: textColor }}>
        {value}%
      </div>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const ready = status === 'ready';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: ready ? 'rgba(34,197,94,0.15)' : 'rgba(251,146,60,0.15)',
      border: `1px solid ${ready ? 'rgba(34,197,94,0.4)' : 'rgba(251,146,60,0.4)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ready ? '#22C55E' : '#FB923C', display: 'block' }} />
      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ready ? '#15803D' : '#C2410C', letterSpacing: '0.04em' }}>
        {ready ? 'READY' : 'PROCESSING'}
      </span>
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────
function DeleteModal({ courseName, onConfirm, onCancel, loading }: {
  courseName: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--paper-2)', border: '2px solid var(--ink)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-hard)', maxWidth: 440, width: '100%', padding: '32px 28px' }}>
        <div style={{ fontSize: 36, marginBottom: 16, textAlign: 'center' }}>🗑️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>Delete Course?</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently delete <strong style={{ color: 'var(--ink)' }}>{courseName}</strong> and all its topics, quiz items, study cards and readiness data. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', background: 'var(--paper-2)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 0 var(--ink)' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '12px', border: '2px solid #DC2626', borderRadius: 'var(--r-sm)', background: '#DC2626', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 3px 0 #7F1D1D', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Three-dot menu ────────────────────────────────────────────────────────────
function CardMenu({ onDelete, textColor }: { onDelete: () => void; textColor: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${textColor === '#fff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: textColor, transition: 'all 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = textColor === '#fff' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--paper-2)', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-hard)', minWidth: 140, zIndex: 50, overflow: 'hidden' }}>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#DC2626', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >🗑️ Delete course</button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: dbCourses } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    const list = (dbCourses as any[]) || [];

    const enriched = await Promise.all(list.map(async (c: any, idx: number) => {
      const [{ count: topicCount }, { data: masteryData }, { data: readinessData }] = await Promise.all([
        (supabase.from('content_units') as any).select('*', { count: 'exact', head: true }).eq('course_id', c.id),
        supabase.from('mastery_states').select('p_mastered').eq('course_id', c.id),
        supabase.from('readiness_estimates').select('point').eq('course_id', c.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const mData = (masteryData as any[]) || [];
      const mastery = mData.length > 0
        ? Math.round((mData.reduce((s: number, x: any) => s + Number(x.p_mastered), 0) / mData.length) * 100)
        : 0;
      const readiness = readinessData?.[0] ? Math.round((readinessData[0] as any).point) : null;
      const daysLeft = c.exam_date ? Math.max(0, Math.ceil((new Date(c.exam_date).getTime() - Date.now()) / 86400000)) : null;
      const palette = SPINE_COLORS[idx % SPINE_COLORS.length];

      return {
        id: c.id, name: c.name, status: c.status || 'ready',
        topicCount: topicCount || 0, mastery, readiness, daysLeft,
        examDate: c.exam_date ? new Date(c.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
        palette, createdAt: c.created_at,
      };
    }));

    setCourses(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) { const b = await res.json().catch(() => ({})); alert(`Delete failed: ${b.error || res.statusText}`); setDeleting(false); return; }
      setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
    } catch { alert('Network error — could not delete course.'); }
    setDeleteTarget(null);
    setDeleting(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 48px 80px' }}>

      {/* ── Header ── */}
      <div data-tour="tour-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            Your study workspace
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 48px)', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            MY <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)', fontSize: '1.12em' }}>courses</span>
          </h1>
          {!loading && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {courses.length} course{courses.length !== 1 ? 's' : ''} enrolled
            </p>
          )}
        </div>
        <Link href="/courses/new" style={{ textDecoration: 'none' }} data-tour="tour-new-course">
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', border: '2px solid var(--ink)',
            borderRadius: 'var(--pill)', background: 'var(--lime)',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 0 var(--ink)', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 0 var(--ink)'; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '0 4px 0 var(--ink)'; }}
          >
            <Sparkle size={14} color="var(--ink)" />
            New course
          </button>
        </Link>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="responsive-grid-3" style={{ gap: 24 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 240, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div className="responsive-grid-3" style={{ gap: 24 }}>

          {courses.map((course, idx) => (
            <div key={course.id} style={{ position: 'relative' }} {...(idx === 0 ? { 'data-tour': 'tour-course-card' } : {})}>
              <Link href={`/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div
                  style={{
                    background: 'var(--paper-2)', border: '2px solid var(--ink)',
                    borderRadius: 16, boxShadow: '4px 4px 0 var(--ink)',
                    overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translate(-2px,-2px)'; el.style.boxShadow = '6px 6px 0 var(--ink)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.boxShadow = '4px 4px 0 var(--ink)'; }}
                >
                  {/* ── Coloured header strip ── */}
                  <div style={{
                    background: course.palette.bg,
                    padding: '20px 20px 16px',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: course.palette.label, marginBottom: 6, fontWeight: 700 }}>
                        Course
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.35, color: course.palette.text, wordBreak: 'break-word' }}>
                        {course.name}
                      </div>
                    </div>
                    <MasteryRing value={course.mastery} textColor={course.palette.text} />
                  </div>

                  {/* ── Card body ── */}
                  <div style={{ padding: '14px 18px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Stats chips */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* Topics */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 99,
                        background: 'var(--surface)', border: '1px solid var(--line)',
                        fontSize: 11, fontWeight: 600, color: 'var(--ink)',
                      }}>
                        <span>📚</span>
                        {course.topicCount > 0 ? `${course.topicCount} topics` : 'No topics yet'}
                      </div>

                      {/* Readiness */}
                      {course.readiness !== null && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 99,
                          background: course.readiness >= 70 ? 'rgba(34,197,94,0.1)' : course.readiness >= 50 ? 'rgba(42,59,201,0.08)' : 'rgba(251,146,60,0.1)',
                          border: `1px solid ${course.readiness >= 70 ? 'rgba(34,197,94,0.3)' : course.readiness >= 50 ? 'rgba(42,59,201,0.25)' : 'rgba(251,146,60,0.3)'}`,
                          fontSize: 11, fontWeight: 700,
                          color: course.readiness >= 70 ? '#15803D' : course.readiness >= 50 ? 'var(--cobalt)' : '#C2410C',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          <span>🎯</span>
                          {course.readiness}% readiness
                        </div>
                      )}
                    </div>

                    {/* Bottom row: exam date + status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      {course.examDate ? (
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 2 }}>Exam</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{course.examDate}</span>
                            {course.daysLeft !== null && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                                background: course.daysLeft <= 7 ? 'var(--magenta)' : course.daysLeft <= 30 ? 'var(--tangerine)' : 'var(--lime)',
                                color: 'var(--ink)', border: '1px solid var(--ink)',
                              }}>
                                {course.daysLeft}d
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>No exam date set</div>
                      )}
                      <StatusPill status={course.status} />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Three-dot menu — outside Link so it doesn't navigate */}
              <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }}>
                <CardMenu
                  onDelete={() => setDeleteTarget({ id: course.id, name: course.name })}
                  textColor={course.palette.text}
                />
              </div>
            </div>
          ))}

          {/* ── New course placeholder ── */}
          <Link href="/courses/new" style={{ textDecoration: 'none' }}>
            <div
              style={{
                border: '2px dashed var(--line)', borderRadius: 16, minHeight: 240,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 28, gap: 14, transition: 'all 0.15s', background: 'transparent',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--cobalt)'; el.style.background = 'rgba(42,59,201,0.03)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--line)'; el.style.background = 'transparent'; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', textAlign: 'center' }}>Add new course</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>Upload slides, notes, past papers</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          courseName={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
