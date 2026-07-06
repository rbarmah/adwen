'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface KPIs {
  totalUsers: number;
  totalCourses: number;
  totalSessions: number;
  totalResponses: number;
  totalChatMessages: number;
  totalAgentCalls: number;
  totalTokens: number;
}

interface UserRow {
  id: string;
  email: string;
  courses: number;
  quizzes: number;
  answers: number;
  messages: number;
  engagement: number;
  lastActive: string;
}

type SortKey = 'email' | 'courses' | 'quizzes' | 'answers' | 'messages' | 'engagement' | 'lastActive';

export default function AdminAnalyticsPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('engagement');
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

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
  const KpiCard = ({ label, value, accent, sub }: { label: string; value: string | number; accent: string; sub?: string }) => (
    <div className="card" style={{
      padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: accent,
      }} />
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px', fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', color: accent,
        lineHeight: 1,
      }}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  );

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      onClick={() => handleSort(sortKeyName)}
      style={{
        padding: '12px 14px', textAlign: sortKeyName === 'email' ? 'left' : 'center',
        fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: sortKey === sortKeyName ? 'var(--cobalt)' : 'var(--muted)',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: 700,
        borderBottom: '2px solid var(--ink)',
      }}
    >
      {label} {sortKey === sortKeyName ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

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
              Usage data across all students
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px', marginBottom: '40px',
          }}>
            <KpiCard label="Total Users" value={kpis.totalUsers} accent="var(--cobalt)" />
            <KpiCard label="Courses Created" value={kpis.totalCourses} accent="var(--green)" />
            <KpiCard label="Quiz Sessions" value={kpis.totalSessions} accent="var(--tangerine)" />
            <KpiCard label="Questions Answered" value={kpis.totalResponses} accent="var(--magenta)" />
            <KpiCard label="Chat Messages" value={kpis.totalChatMessages} accent="var(--cobalt)" />
            <KpiCard label="AI API Calls" value={kpis.totalAgentCalls} accent="var(--green)" sub={`${formatNumber(kpis.totalTokens)} tokens`} />
          </div>
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
                USER <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Leaderboard</span>
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '2px' }}>
                {filtered.length} user{filtered.length !== 1 ? 's' : ''} · sorted by {sortKey}
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search email..."
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
                  <SortHeader label="Email" sortKeyName="email" />
                  <SortHeader label="Courses" sortKeyName="courses" />
                  <SortHeader label="Quizzes" sortKeyName="quizzes" />
                  <SortHeader label="Answers" sortKeyName="answers" />
                  <SortHeader label="Chats" sortKeyName="messages" />
                  <SortHeader label="Engagement" sortKeyName="engagement" />
                  <SortHeader label="Last Active" sortKeyName="lastActive" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid var(--line)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)',
                  }}>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.courses}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.quizzes}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.answers}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>{user.messages}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
                        fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-mono)',
                        background: user.engagement > 50 ? 'var(--green-soft)' : user.engagement > 10 ? 'var(--cobalt-soft)' : 'var(--paper-2)',
                        color: user.engagement > 50 ? 'var(--green)' : user.engagement > 10 ? 'var(--cobalt)' : 'var(--muted)',
                        border: `1.5px solid ${user.engagement > 50 ? 'var(--green)' : user.engagement > 10 ? 'var(--cobalt)' : 'var(--line)'}`,
                      }}>
                        {user.engagement}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                      {formatDate(user.lastActive)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                      {search ? 'No users match your search.' : 'No user data yet.'}
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
