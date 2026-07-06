'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface KPIs {
  totalUsers: number;
  totalCourses: number;
  totalQuizSessions: number;
  totalQuestionsAnswered: number;
  totalChatMessages: number;
  totalAICalls: number;
  totalStudyCardSets: number;
}

interface UserRow {
  id: string;
  email: string;
  joinedAt: string;
  lastSignIn: string;
  courses: number;
  quizzes: number;
  answers: number;
  messages: number;
  totalActivity: number;
}

type SortKey = 'email' | 'courses' | 'quizzes' | 'answers' | 'messages' | 'totalActivity' | 'lastSignIn';

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
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'email');
    }
  };

  const filtered = leaderboard
    .filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
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
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  };

  // ── Auth screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)', padding: '32px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
            textTransform: 'uppercase', marginBottom: '8px',
          }}>
            ADMIN <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Analytics</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginBottom: '32px' }}>
            Enter your admin secret to view platform analytics.
          </p>
          <div className="card" style={{ padding: '32px' }}>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="Admin Secret"
              style={{
                width: '100%', padding: '14px 16px', border: '2px solid var(--ink)',
                borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '14px',
                marginBottom: '16px', boxSizing: 'border-box', outline: 'none',
                background: 'var(--paper-2)',
              }}
            />
            {authError && (
              <p style={{ color: 'var(--magenta)', fontSize: '13px', marginBottom: '12px' }}>{authError}</p>
            )}
            <button
              onClick={handleAuth}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              Authenticate →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', border: '4px solid var(--line)',
            borderTop: '4px solid var(--cobalt)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ── KPI card helper ────────────────────────────────────────────────────────
  const KpiCard = ({ label, description, value, accent }: { label: string; description: string; value: number; accent: string }) => (
    <div className="card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accent }} />
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
        color: accent, lineHeight: 1, marginBottom: '8px',
      }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
        {description}
      </div>
    </div>
  );

  const SortHeader = ({ label, sortKeyName, align = 'center' }: { label: string; sortKeyName: SortKey; align?: string }) => (
    <th
      onClick={() => handleSort(sortKeyName)}
      style={{
        padding: '12px 14px', textAlign: align as any,
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: sortKey === sortKeyName ? 'var(--cobalt)' : 'var(--muted)',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: 700,
        borderBottom: '2px solid var(--ink)',
      }}
    >
      {label} {sortKey === sortKeyName ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  const getActivityLabel = (n: number) => {
    if (n >= 100) return { text: 'Power User', color: 'var(--green)', bg: 'var(--green-soft)' };
    if (n >= 30) return { text: 'Active', color: 'var(--cobalt)', bg: 'var(--cobalt-soft)' };
    if (n >= 5) return { text: 'Getting Started', color: 'var(--tangerine)', bg: '#FFF8F0' };
    if (n >= 1) return { text: 'New', color: 'var(--muted)', bg: 'var(--paper-2)' };
    return { text: 'Inactive', color: 'var(--muted)', bg: 'var(--paper-2)' };
  };

  // ── Main dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
              textTransform: 'uppercase', margin: 0,
            }}>
              PLATFORM <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Analytics</span>
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              How students are using Adwen
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin/waitlist" style={{
              padding: '10px 20px', borderRadius: 'var(--radius-pill)',
              border: '2px solid var(--ink)', background: 'var(--paper-2)',
              fontWeight: 700, fontSize: '13px', color: 'var(--ink)',
              textDecoration: 'none', fontFamily: 'var(--font-body)',
            }}>
              ← Waitlist
            </Link>
            <button onClick={() => fetchData()} style={{
              padding: '10px 20px', borderRadius: 'var(--radius-pill)',
              border: '2px solid var(--ink)', background: 'var(--lime)',
              fontWeight: 700, fontSize: '13px', color: 'var(--ink)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              boxShadow: '0 3px 0 var(--ink)',
            }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        {kpis && (
          <>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: '12px',
            }}>
              Platform Overview
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px', marginBottom: '40px',
            }}>
              <KpiCard
                label="Registered Students"
                description="Students who signed up and completed onboarding"
                value={kpis.totalUsers}
                accent="var(--cobalt)"
              />
              <KpiCard
                label="Courses Uploaded"
                description="Course material sets uploaded by students"
                value={kpis.totalCourses}
                accent="var(--green)"
              />
              <KpiCard
                label="Quiz Sessions"
                description="Number of times a student started a quiz"
                value={kpis.totalQuizSessions}
                accent="var(--tangerine)"
              />
              <KpiCard
                label="Quiz Questions Answered"
                description="Individual quiz questions answered across all students"
                value={kpis.totalQuestionsAnswered}
                accent="var(--magenta)"
              />
              <KpiCard
                label="Chat Messages"
                description="Total messages exchanged with Adwen tutor"
                value={kpis.totalChatMessages}
                accent="var(--cobalt)"
              />
              <KpiCard
                label="Flashcard Sets Generated"
                description="Study card sets created by the AI tutor"
                value={kpis.totalStudyCardSets}
                accent="var(--green)"
              />
              <KpiCard
                label="AI Calls Made"
                description="Total OpenAI API calls (quiz gen, chat, cards, etc.)"
                value={kpis.totalAICalls}
                accent="var(--navy)"
              />
            </div>
          </>
        )}

        {/* Leaderboard */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '2px solid var(--ink)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
                textTransform: 'uppercase', margin: 0,
              }}>
                STUDENT <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Activity</span>
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>
                {filtered.length} student{filtered.length !== 1 ? 's' : ''} — who is using the platform the most?
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email..."
              style={{
                padding: '8px 14px', border: '2px solid var(--line)', borderRadius: '10px',
                fontFamily: 'var(--font-body)', fontSize: '13px', width: '220px',
                outline: 'none', background: 'var(--paper-2)',
              }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
            }}>
              <thead>
                <tr style={{ background: 'var(--paper-2)' }}>
                  <th style={{
                    padding: '12px 14px', textAlign: 'center', width: '40px',
                    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)',
                    borderBottom: '2px solid var(--ink)', fontWeight: 700,
                  }}>
                    #
                  </th>
                  <SortHeader label="Student Email" sortKeyName="email" align="left" />
                  <SortHeader label="Courses" sortKeyName="courses" />
                  <SortHeader label="Quizzes Taken" sortKeyName="quizzes" />
                  <SortHeader label="Questions Done" sortKeyName="answers" />
                  <SortHeader label="Chat Messages" sortKeyName="messages" />
                  <SortHeader label="Status" sortKeyName="totalActivity" />
                  <SortHeader label="Last Seen" sortKeyName="lastSignIn" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => {
                  const status = getActivityLabel(user.totalActivity);
                  return (
                    <tr key={user.id} style={{
                      borderBottom: '1px solid var(--line)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)',
                    }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div>{user.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                          Joined {formatJoinDate(user.joinedAt)}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.courses}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.quizzes}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.answers}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.messages}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                          fontWeight: 700, fontSize: '11px',
                          background: status.bg, color: status.color,
                          border: `1.5px solid ${status.color}`,
                        }}>
                          {status.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                        {formatDate(user.lastSignIn)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
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
