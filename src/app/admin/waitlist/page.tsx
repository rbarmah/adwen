'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

interface WaitlistEntry {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
}

export default function AdminWaitlistPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [toast, setToast] = useState('');
  const [authError, setAuthError] = useState('');

  // Simple admin auth — enter the ADMIN_SECRET
  const handleAuth = () => {
    if (secret.trim()) {
      setAuthError('');
      localStorage.setItem('adwen_admin_secret', secret.trim());
      setAuthed(true);
      fetchEntries(secret.trim());
    }
  };

  const getSecret = () => {
    return localStorage.getItem('adwen_admin_secret') || secret;
  };

  const fetchEntries = async (adminSecret?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/waitlist', {
        headers: { 'x-admin-secret': adminSecret || getSecret() },
      });
      if (res.status === 401) {
        setAuthed(false);
        setAuthError('Invalid admin secret. Check your ADMIN_SECRET env var.');
        localStorage.removeItem('adwen_admin_secret');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch waitlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await fetch('/api/waitlist/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': getSecret(),
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Approved ${email} — email sent`);
        fetchEntries();
      } else {
        showToast(`❌ Failed: ${data.error}`);
      }
    } catch {
      showToast('❌ Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': getSecret(),
        },
        body: JSON.stringify({ email, status: 'rejected' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Rejected ${email}`);
        fetchEntries();
      }
    } catch {
      showToast('❌ Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('adwen_admin_secret');
    if (saved) {
      setSecret(saved);
      setAuthed(true);
      fetchEntries(saved);
    } else {
      setLoading(false);
    }
  }, []);

  const filtered = entries.filter(e => filter === 'all' || e.status === filter);
  const counts = {
    all: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    approved: entries.filter(e => e.status === 'approved').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  };

  // ── Auth Gate ──
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--navy)', padding: '32px 16px',
      }}>
        <div style={{
          maxWidth: 400, width: '100%', background: '#fff',
          border: '2px solid var(--ink)', borderRadius: 'var(--r)',
          padding: '36px 28px', boxShadow: '0 6px 0 var(--ink)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--lime)', border: '2px solid var(--ink)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 2px 0 var(--ink)',
            }}>
              <Icon name="bulb" size={18} color="var(--ink)" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>Admin</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginBottom: 20 }}>
            Enter your admin secret to manage the waitlist.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="Admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={{
                padding: '12px 16px', border: '2px solid var(--ink)', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
              }}
            />
            {authError && (
              <p style={{ color: 'var(--danger, #e53935)', fontSize: 13, margin: 0, fontWeight: 600 }}>{authError}</p>
            )}
            <Button type="submit" size="md" variant="primary" style={{ width: '100%' }}>
              Authenticate
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ──
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--surface)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <header style={{
        height: 56, borderBottom: '2px solid var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', background: '#fff',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--lime)', border: '2px solid var(--ink)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 0 var(--ink)',
          }}>
            <Icon name="bulb" size={16} color="var(--ink)" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)' }}>Adwen</span>
          <Badge variant="cobalt" size="sm">Admin</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/admin/analytics"
            style={{
              padding: '6px 14px', border: '2px solid var(--cobalt)', borderRadius: 'var(--pill)',
              background: 'var(--cobalt-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)', color: 'var(--cobalt)', textDecoration: 'none',
            }}
          >
            📊 Analytics
          </Link>
          <button
            onClick={() => { localStorage.removeItem('adwen_admin_secret'); setAuthed(false); }}
            style={{
              padding: '6px 14px', border: '2px solid var(--ink)', borderRadius: 'var(--pill)',
              background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 16px' }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
            textTransform: 'uppercase', margin: '0 0 6px',
          }}>
            WAITLIST{' '}
            <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)', fontSize: '1.1em' }}>
              Manager
            </span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            Approve or reject users waiting to join Adwen.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
        }}>
          {([
            { key: 'all' as const, label: 'Total', color: 'var(--ink)' },
            { key: 'pending' as const, label: 'Pending', color: 'var(--tangerine)' },
            { key: 'approved' as const, label: 'Approved', color: 'var(--green)' },
            { key: 'rejected' as const, label: 'Rejected', color: 'var(--magenta)' },
          ]).map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              style={{
                padding: '10px 18px', borderRadius: 'var(--r-sm)',
                border: filter === s.key ? '2px solid var(--ink)' : '2px solid var(--line)',
                background: filter === s.key ? '#fff' : 'transparent',
                boxShadow: filter === s.key ? '0 2px 0 var(--ink)' : 'none',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: '0.15s',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: s.color }}>
                {counts[s.key]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '48px 24px', textAlign: 'center',
            border: '2px dashed var(--line)', borderRadius: 'var(--r)',
            color: 'var(--muted)', fontSize: 14,
          }}>
            No {filter === 'all' ? '' : filter} entries yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(entry => {
              const date = new Date(entry.created_at);
              const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              const isActioning = actionLoading === entry.email;

              return (
                <div
                  key={entry.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: entry.status === 'approved' ? 'var(--green)'
                      : entry.status === 'rejected' ? 'var(--magenta)'
                      : 'var(--tangerine)',
                  }} />

                  {/* Email + meta */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, wordBreak: 'break-all' }}>
                      {entry.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      Joined {dateStr} at {timeStr}
                      {entry.approved_at && ` · Approved ${new Date(entry.approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant={entry.status === 'approved' ? 'green' : entry.status === 'rejected' ? 'magenta' : 'tangerine'}
                    size="sm"
                  >
                    {entry.status}
                  </Badge>

                  {/* Actions */}
                  {entry.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="sm"
                        variant="lime"
                        onClick={() => handleApprove(entry.email)}
                        loading={isActioning}
                        disabled={isActioning}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(entry.email)}
                        disabled={isActioning}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {entry.status === 'approved' && (
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✓ Email sent</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', padding: '12px 24px',
          borderRadius: 'var(--pill)', fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          zIndex: 100, animation: 'fadeIn 0.2s ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
