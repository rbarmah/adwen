'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import GuidedTour, { buildTourSteps } from '@/components/Tutorial';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [teleOpen, setTeleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDropRef = useRef<HTMLDivElement>(null);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourSteps, setTourSteps] = useState(buildTourSteps());

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?';

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropRef.current && !profileDropRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTelemetry = async (uid: string) => {
    const supabase = createClient();
    const list: any[] = [];

    const { data: responseEvents } = await (supabase
      .from('response_events')
      .select('*, items(stem)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20) as any);

    if (responseEvents) {
      responseEvents.forEach((ev: any) => {
        const timeStr = new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const stemSnippet = ev.items?.stem ? `"${ev.items.stem.substring(0, 22)}..."` : 'Question';
        const sec = (ev.latency_ms / 1000).toFixed(1);
        list.push({ timestamp: ev.created_at, time: timeStr, type: 'quiz', desc: `${stemSnippet} · ${ev.is_correct ? 'correct' : 'wrong'} · ${sec}s` });
        if (ev.theta_before !== null && ev.theta_after !== null) {
          list.push({ timestamp: new Date(new Date(ev.created_at).getTime() + 1).toISOString(), time: timeStr, type: 'system', desc: `θ: ${Number(ev.theta_before).toFixed(2)} → ${Number(ev.theta_after).toFixed(2)}` });
        }
      });
    }

    const { data: courses } = await (supabase.from('courses').select('name,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5) as any);
    if (courses) {
      courses.forEach((c: any) => {
        const timeStr = new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        list.push({ timestamp: c.created_at, time: timeStr, type: 'course', desc: `Course "${c.name}" registered` });
      });
    }

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setDbEvents(list.slice(0, 30));
  };

  useEffect(() => {
    const supabase = createClient();
    let channel: any;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      await fetchTelemetry(user.id);

      // Check if tour should be shown
      if (typeof window !== 'undefined' && !localStorage.getItem('adwen_tutorial_seen')) {
        // Fetch first course ID for tour steps that navigate into a course
        const { data: courses } = await supabase.from('courses').select('id').order('created_at', { ascending: false }).limit(1);
        const firstCourseId = courses?.[0]?.id || undefined;
        setTourSteps(buildTourSteps(firstCourseId));
        setShowTour(true);
      }

      // Use a unique channel name per mount — prevents StrictMode double-invoke
      // from finding and reusing an already-subscribed channel
      channel = supabase.channel(`tele-${user.id}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'response_events' }, () => fetchTelemetry(user.id))
        .subscribe();
    };
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Global top bar ── */}
      <header style={{
        height: 52,
        borderBottom: '2px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <button
          onClick={() => router.push('/courses')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--lime)', border: '2px solid var(--ink)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 0 var(--ink)',
          }}>
            <Icon name="bulb" size={16} color="var(--ink)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', lineHeight: 1 }}>Adwen</span>
        </button>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Telemetry */}
          <button
            data-tour="tour-telemetry"
            onClick={() => setTeleOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', border: '2px solid var(--ink)',
              background: '#fff', borderRadius: 'var(--pill)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 2px 0 var(--ink)',
            }}
          >
            Telemetry
            <span style={{ fontFamily: 'var(--font-mono)', background: 'var(--magenta)', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 10 }}>
              {dbEvents.length}
            </span>
          </button>

          {/* Profile avatar */}
          <div ref={profileDropRef} style={{ position: 'relative' }} data-tour="tour-profile-btn">
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--cobalt-deep)',
                border: '2px solid var(--ink)',
                boxShadow: profileOpen ? '0 0 0 3px var(--lime)' : '0 2px 0 var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                color: '#fff', cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
            >
              {initials}
            </button>

            {profileOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--paper-2)', border: '2px solid var(--ink)',
                borderRadius: 'var(--r)', boxShadow: 'var(--shadow-hard)',
                minWidth: 220, zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '2px solid var(--ink)', background: 'var(--cobalt-deep)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lime)', border: '2px solid rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--ink)', marginBottom: 7 }}>
                    {initials}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 }}>{user?.email?.split('@')[0] || 'Student'}</div>
                  <div style={{ fontSize: 11, color: '#9499E0', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</div>
                </div>
                {[
                  { icon: '👤', label: 'View Profile', action: () => { router.push('/profile'); setProfileOpen(false); } },
                  { icon: '⚙️', label: 'Settings', action: () => { router.push('/settings'); setProfileOpen(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 14px', border: 'none',
                    background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: 13, fontWeight: 600, color: 'var(--ink)', textAlign: 'left',
                    borderBottom: '1px solid var(--line)', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}
                <button onClick={() => { handleSignOut(); setProfileOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: 13, fontWeight: 600, color: '#e53935', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFF0EE')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span>🚪</span>Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px 16px 60px', boxSizing: 'border-box', overflow: 'hidden' }}>
        {children}
      </main>

      {/* ── Telemetry drawer ── */}
      <div onClick={() => setTeleOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.4)', zIndex: 55, opacity: teleOpen ? 1 : 0, pointerEvents: teleOpen ? 'auto' : 'none', transition: '0.3s' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: 'var(--cobalt-deep)', color: '#D6D9F5', zIndex: 60,
        transform: teleOpen ? 'none' : 'translateX(100%)', transition: 'transform 0.3s',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,.3)', borderLeft: '3px solid var(--ink)',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Telemetry</h3>
            <div style={{ fontSize: 10, color: '#9499E0', fontFamily: 'var(--font-mono)', marginTop: 2 }}>append-only event log</div>
          </div>
          <button onClick={() => setTeleOpen(false)} style={{ color: '#C6CAF2', padding: 8, cursor: 'pointer', background: 'none', border: 'none' }}>
            <Icon name="x" size={18} color="#C6CAF2" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}>
          {dbEvents.map((ev, i) => {
            const tc: Record<string, { bg: string; color: string }> = {
              quiz:    { bg: 'var(--tangerine)', color: 'var(--ink)' },
              course:  { bg: 'var(--lime)', color: 'var(--ink)' },
              system:  { bg: 'rgba(255,255,255,.16)', color: '#C6CAF2' },
            };
            const c = tc[ev.type] || tc.system;
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.1)', fontSize: 12, display: 'flex', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#9499E0', fontSize: 10, whiteSpace: 'nowrap', flexShrink: 0 }}>{ev.time}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: c.bg, color: c.color, height: 'fit-content', flexShrink: 0 }}>{ev.type}</span>
                <span style={{ color: '#E2E4F7', lineHeight: 1.4 }}>{ev.desc}</span>
              </div>
            );
          })}
          {dbEvents.length === 0 && <div style={{ padding: '20px 0', textAlign: 'center', color: '#9499E0', fontSize: 13 }}>No events logged yet.</div>}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.16)', fontSize: 10, color: '#9499E0', fontFamily: 'var(--font-mono)' }}>
          INSERT/SELECT only · UPDATE/DELETE revoked
        </div>
      </div>
    </div>

    {/* Guided Tour */}
    {showTour && <GuidedTour steps={tourSteps} onComplete={() => setShowTour(false)} />}

    </>
  );
}
