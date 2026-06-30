'use client';

import React, { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

// ── Nav sections ────────────────────────────────────────────────────────────

const NAV = [
  {
    section: 'OVERVIEW',
    items: [
      { key: 'overview', icon: 'bulb' as const, label: 'Course Dashboard', sub: '' },
    ],
  },
  {
    section: 'STUDY',
    items: [
      { key: 'study',   icon: 'brain'  as const, label: 'Study Materials',   sub: '/study' },
      { key: 'quiz',    icon: 'quiz'   as const, label: 'Adaptive Quiz',     sub: '/quiz' },
    ],
  },
  {
    section: 'INTELLIGENCE',
    items: [
      { key: 'analysis', icon: 'scan'  as const, label: 'Course Intelligence', sub: '/analysis' },
      { key: 'insights', icon: 'chart' as const, label: 'Personal Intelligence', sub: '/insights' },
      { key: 'outcome',  icon: 'loop'  as const, label: 'Outcome Loop',  sub: '/outcome' },
    ],
  },
];

function getActiveKey(pathname: string): string {
  if (pathname.includes('/insights'))  return 'insights';
  if (pathname.includes('/analysis'))  return 'analysis';
  if (pathname.includes('/study'))     return 'study';
  if (pathname.includes('/quiz'))      return 'quiz';
  if (pathname.includes('/outcome'))   return 'outcome';
  // Base course page — /courses/[id] with no sub-path
  if (/\/courses\/[^/]+\/?$/.test(pathname)) return 'overview';
  return '';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const params  = useParams();
  const courseId = params.id as string;
  const pathname = usePathname();
  const router   = useRouter();
  const activeKey = getActiveKey(pathname);

  const [courseName,     setCourseName]     = useState('');
  const [readinessLabel, setReadinessLabel] = useState('—');
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [mobileOpen,     setMobileOpen]     = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const supabase = createClient();

    const load = async () => {
      const { data: course } = await (supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single() as any);
      if (course) setCourseName(course.name);

      const { data: readiness } = await (supabase
        .from('readiness_estimates')
        .select('point, ci_low, ci_high')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(1) as any);

      if (readiness && readiness.length > 0) {
        const r = readiness[0] as any;
        const lo = r.ci_low  !== null ? Math.round(Number(r.ci_low))  : Math.max(0,   Math.round(Number(r.point)) - 15);
        const hi = r.ci_high !== null ? Math.round(Number(r.ci_high)) : Math.min(100, Math.round(Number(r.point)) + 15);
        setReadinessLabel(`${lo}–${hi}%`);
      }
    };

    load();

    // ── Background Generation Loop ──
    let loopActive = true;
    const runGenerationLoop = async () => {
      try {
        let remaining = 1;
        let retries = 0;
        while (remaining > 0 && loopActive) {
          const res = await fetch(`/api/courses/${courseId}/generate-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemsPerCombo: 3, perCallCap: 20 }),
          });
          
          if (!res.ok) {
            console.error('[background-gen] API error or timeout. Retrying in 5s...');
            retries++;
            if (retries > 5) break; // Give up after 5 consecutive failures
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          
          retries = 0; // Reset retries on success
          const body = await res.json();
          remaining = body.remaining ?? 0;
          
          // Brief pause between successful batches
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (e) {
        console.error('[background-gen] Generation loop error:', e);
      }
    };
    runGenerationLoop();

    return () => {
      loopActive = false; // Stop the loop if the user fully leaves the course
    };
  }, [courseId]);

  const navBtnStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '9px 10px',
    borderRadius: 'var(--pill)',
    color: isActive ? 'var(--ink)' : '#C6CAF2',
    background: isActive ? 'var(--lime)' : 'transparent',
    fontSize: 13,
    fontWeight: 600,
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.15s, color 0.15s',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  });

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="course-sidebar" style={{
        width: sidebarOpen ? 232 : 0,
        minWidth: sidebarOpen ? 232 : 0,
        background: 'var(--cobalt-deep)',
        color: '#D6D9F5',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s, min-width 0.25s',
        flexShrink: 0,
        borderRight: '2px solid var(--ink)',
        height: 'calc(100vh - 52px)',
        position: 'sticky',
        top: 52,
      }}>
        <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Course name */}
          <div style={{ padding: '4px 8px 14px', borderBottom: '1px solid rgba(255,255,255,.12)', marginBottom: 8 }}>
            <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7A7FD0', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              Current Course
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.3, wordBreak: 'break-word' }}>
              {courseName || '…'}
            </div>
            {readinessLabel !== '—' && (
              <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.1)', borderRadius: 99, padding: '2px 8px' }}>
                <span style={{ fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--lime)', fontFamily: 'var(--font-mono)' }}>Readiness</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#fff' }}>{readinessLabel}</span>
              </div>
            )}
          </div>

          {/* Nav sections */}
          {NAV.map(section => (
            <div key={section.section} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7A7FD0', padding: '10px 10px 4px', fontFamily: 'var(--font-mono)' }}>
                {section.section}
              </div>
              {section.items.map(item => {
                const isActive = item.key === activeKey;
                const href = `/courses/${courseId}${item.sub}`;
                return (
                  <button
                    key={item.key}
                    onClick={() => router.push(href)}
                    style={navBtnStyle(isActive)}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <Icon name={item.icon} size={15} color={isActive ? 'var(--ink)' : '#C6CAF2'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Back to courses */}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <button
              onClick={() => router.push('/courses')}
              style={navBtnStyle(false)}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C6CAF2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
              </svg>
              <span>All Courses</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <div className={`sidebar-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar-drawer${mobileOpen ? ' open' : ''}`} style={{ background: 'var(--cobalt-deep)', color: '#D6D9F5', padding: '16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{courseName || 'Course'}</span>
          <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {NAV.map(g => (
          <div key={g.section} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#8389C5', marginBottom: 6, paddingLeft: 10 }}>{g.section}</div>
            {g.items.map(item => (
              <button key={item.key} onClick={() => { router.push(`/courses/${courseId}${item.sub}`); setMobileOpen(false); }} style={navBtnStyle(activeKey === item.key)}>
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <button onClick={() => { router.push('/courses'); setMobileOpen(false); }} style={navBtnStyle(false)}>
            ← All Courses
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', height: 'calc(100vh - 52px)' }}>
        {/* Content top strip with breadcrumb + toggle */}
        <div style={{
          height: 48,
          borderBottom: '2px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 12,
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}>
          {/* Mobile hamburger */}
          <button
            className="hamburger-btn responsive-hide-desktop"
            onClick={() => setMobileOpen(true)}
            style={{ display: 'none' }}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
          <button
            className="responsive-hide-mobile"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'var(--muted)' }}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {courseName || '…'} /
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {activeKey || 'overview'}
          </span>
        </div>

        <div style={{ flex: 1, padding: '28px 20px 80px', maxWidth: 980, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div className="animate-fade">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
