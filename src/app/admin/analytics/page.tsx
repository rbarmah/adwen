'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface KPIs {
  totalUsers: number;
  totalCourses: number;
  totalQuizSessions: number;
  totalQuestionsAnswered: number;
  totalChatMessages: number;
  totalFlashcardSets: number;
  totalVisualNotes: number;
  totalAICalls: number;
}

interface UserRow {
  id: string;
  email: string;
  joinedAt: string;
  lastSignIn: string;
  courses: number;
  quizzes: number;
  answers: number;
  chatMessages: number;
  flashcards: number;
  visualNotes: number;
  masteryTopics: number;
  readinessScores: number;
  totalActivity: number;
}

type SortKey = keyof UserRow;

export default function AdminAnalyticsPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('totalActivity');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');

  const getSecret = () => localStorage.getItem('adwen_admin_secret') || secret;

  const handleAuth = () => {
    if (secret.trim()) {
      setAuthError('');
      localStorage.setItem('adwen_admin_secret', secret.trim());
      setAuthed(true);
      fetchData(secret.trim());
    }
  };

  const fetchData = async (adminSecret?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'x-admin-secret': adminSecret || getSecret() },
      });
      if (res.status === 401) {
        setAuthed(false);
        setAuthError('Invalid admin secret.');
        localStorage.removeItem('adwen_admin_secret');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setKpis(data.kpis);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('adwen_admin_secret');
    if (saved) {
      setAuthed(true);
      fetchData(saved);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'email'); }
  };

  const filtered = leaderboard
    .filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch { return '—'; }
  };

  const formatJoinDate = (iso: string) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
  };

  // ── Auth screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '32px' }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textTransform: 'uppercase', marginBottom: '8px' }}>
            ADMIN <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Analytics</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginBottom: '32px' }}>Enter your admin secret to view platform analytics.</p>
          <div className="card" style={{ padding: '32px' }}>
            <input type="password" value={secret} onChange={e => setSecret(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Admin Secret"
              style={{ width: '100%', padding: '14px 16px', border: '2px solid var(--ink)', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none', background: 'var(--paper-2)' }}
            />
            {authError && <p style={{ color: 'var(--magenta)', fontSize: '13px', marginBottom: '12px' }}>{authError}</p>}
            <button onClick={handleAuth} className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>Authenticate →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid var(--line)', borderTop: '4px solid var(--cobalt)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const KpiCard = ({ label, desc, value, accent }: { label: string; desc: string; value: number; accent: string }) => (
    <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accent }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: accent, lineHeight: 1, marginBottom: '6px' }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</div>
    </div>
  );

  const SortTh = ({ label, k, align = 'center' }: { label: string; k: SortKey; align?: string }) => (
    <th onClick={() => handleSort(k)} style={{
      padding: '10px 8px', textAlign: align as any, fontFamily: 'var(--font-mono)', fontSize: '9px',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700,
      color: sortKey === k ? 'var(--cobalt)' : 'var(--muted)', cursor: 'pointer', userSelect: 'none',
      whiteSpace: 'nowrap', borderBottom: '2px solid var(--ink)',
    }}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const Cell = ({ n, highlight }: { n: number; highlight?: boolean }) => (
    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: n > 0 ? 600 : 400, color: n > 0 ? 'var(--ink)' : 'var(--line)', fontSize: '13px' }}>
      {highlight && n > 0 ? (
        <span style={{ background: 'var(--green-soft)', border: '1px solid var(--green)', borderRadius: '6px', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--green)', fontWeight: 700 }}>{n}</span>
      ) : n}
    </td>
  );

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', textTransform: 'uppercase', margin: 0 }}>
              PLATFORM <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Analytics</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>How students are using every feature of Adwen</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin/waitlist" style={{ padding: '10px 20px', borderRadius: 'var(--radius-pill)', border: '2px solid var(--ink)', background: 'var(--paper-2)', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
              ← Waitlist
            </Link>
            <button onClick={() => fetchData()} style={{ padding: '10px 20px', borderRadius: 'var(--radius-pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontWeight: 700, fontSize: '13px', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 3px 0 var(--ink)' }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        {kpis && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '40px' }}>
            <KpiCard label="Registered Students" desc="Completed onboarding" value={kpis.totalUsers} accent="var(--cobalt)" />
            <KpiCard label="Courses Uploaded" desc="Course material sets" value={kpis.totalCourses} accent="var(--green)" />
            <KpiCard label="Quiz Sessions" desc="Times a quiz was started" value={kpis.totalQuizSessions} accent="var(--tangerine)" />
            <KpiCard label="Questions Answered" desc="Individual quiz answers" value={kpis.totalQuestionsAnswered} accent="var(--magenta)" />
            <KpiCard label="Chat Messages" desc="Messages with Adwen tutor" value={kpis.totalChatMessages} accent="var(--cobalt)" />
            <KpiCard label="Flashcard Sets" desc="Study card sets generated" value={kpis.totalFlashcardSets} accent="var(--green)" />
            <KpiCard label="Visual Notes" desc="Diagrams/mind maps created" value={kpis.totalVisualNotes} accent="var(--tangerine)" />
            <KpiCard label="Total AI Calls" desc="All OpenAI API calls" value={kpis.totalAICalls} accent="var(--navy)" />
          </div>
        )}

        {/* Per-User Feature Breakdown */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '2px solid var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: 0 }}>
                PER-STUDENT <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Breakdown</span>
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>
                {filtered.length} student{filtered.length !== 1 ? 's' : ''} — click any column to sort
              </p>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email..."
              style={{ padding: '8px 14px', border: '2px solid var(--line)', borderRadius: '10px', fontFamily: 'var(--font-body)', fontSize: '13px', width: '220px', outline: 'none', background: 'var(--paper-2)' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '36px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>#</th>
                  <SortTh label="Student" k="email" align="left" />
                  <SortTh label="Courses" k="courses" />
                  <SortTh label="📝 Quizzes" k="quizzes" />
                  <SortTh label="📝 Answers" k="answers" />
                  <SortTh label="💬 Chat" k="chatMessages" />
                  <SortTh label="📖 Flash­cards" k="flashcards" />
                  <SortTh label="🗺️ Visual" k="visualNotes" />
                  <SortTh label="📊 Mastery" k="masteryTopics" />
                  <SortTh label="Last Seen" k="lastSignIn" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{user.email}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Joined {formatJoinDate(user.joinedAt)}</div>
                    </td>
                    <Cell n={user.courses} />
                    <Cell n={user.quizzes} />
                    <Cell n={user.answers} />
                    <Cell n={user.chatMessages} />
                    <Cell n={user.flashcards} highlight />
                    <Cell n={user.visualNotes} highlight />
                    <Cell n={user.masteryTopics} />
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
                      {formatDate(user.lastSignIn)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      {search ? 'No students match your search.' : 'No student data yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
