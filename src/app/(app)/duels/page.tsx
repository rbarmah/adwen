'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DuelSummary {
  id: string;
  challenger_id: string;
  opponent_id: string;
  course_id: string;
  status: string;
  challenger_correct: number | null;
  opponent_correct: number | null;
  winner_id: string | null;
  created_at: string;
  courses: { name: string };
}

export default function DuelsPage() {
  const router = useRouter();
  const [duels, setDuels] = useState<DuelSummary[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});

  // Challenge flow
  const [showChallenge, setShowChallenge] = useState(false);
  const [step, setStep] = useState<'opponent' | 'course'>('opponent');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; username: string | null }[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<{ id: string; email: string; username: string | null } | null>(null);
  const [myCourses, setMyCourses] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDuels = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/duels');
    const data = await res.json();
    setDuels(data.duels || []);
    setUserId(data.userId || '');

    // Collect all user IDs to resolve display names
    const ids = new Set<string>();
    for (const d of (data.duels || [])) {
      ids.add(d.challenger_id);
      ids.add(d.opponent_id);
    }
    if (ids.size > 0) {
      const res2 = await fetch('/api/users/search?q=@');
      const d2 = await res2.json();
      const map: Record<string, string> = {};
      for (const u of (d2.users || [])) map[u.id] = u.username || u.email;
      setEmailMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDuels(); }, [fetchDuels]);

  const getEmail = (uid: string) => emailMap[uid] || uid.slice(0, 8) + '...';

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    setSearchResults((d.users || []).filter((u: any) => u.id !== userId));
  };

  const selectOpponent = async (user: { id: string; email: string; username: string | null }) => {
    setSelectedOpponent(user);
    setStep('course');
    // Fetch my courses
    const supabase = createClient();
    const { data: courses } = await (supabase.from('courses').select('id, name').eq('user_id', userId).eq('status', 'ready') as any);
    setMyCourses(courses || []);
  };

  const handleCreateDuel = async (courseId: string) => {
    if (!selectedOpponent) return;
    setCreating(true);
    setCreateError('');
    const res = await fetch('/api/duels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentId: selectedOpponent.id, courseId }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.duel) {
      setShowChallenge(false);
      setStep('opponent');
      setSelectedOpponent(null);
      setSearchQ('');
      setCreateError('');
      fetchDuels();
    } else {
      setCreateError(data.error || 'Failed to create duel');
    }
  };

  const handleAccept = async (duelId: string) => {
    setActionLoading(duelId);
    await fetch(`/api/duels/${duelId}/accept`, { method: 'POST' });
    fetchDuels();
    setActionLoading(null);
  };

  const handleDecline = async (duelId: string) => {
    setActionLoading(duelId);
    await fetch(`/api/duels/${duelId}/decline`, { method: 'POST' });
    fetchDuels();
    setActionLoading(null);
  };

  const pendingForMe = duels.filter(d => d.status === 'pending' && d.opponent_id === userId);
  const active = duels.filter(d => ['accepted', 'in_progress'].includes(d.status));
  const pendingSent = duels.filter(d => d.status === 'pending' && d.challenger_id === userId);
  const completed = duels.filter(d => ['completed', 'declined', 'expired'].includes(d.status));

  const wins = completed.filter(d => d.winner_id === userId).length;
  const losses = completed.filter(d => d.status === 'completed' && d.winner_id && d.winner_id !== userId).length;
  const draws = completed.filter(d => d.status === 'completed' && !d.winner_id).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--line)', borderTop: '4px solid var(--magenta)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'completed') return 'var(--green)';
    if (s === 'pending') return 'var(--tangerine)';
    if (['accepted', 'in_progress'].includes(s)) return 'var(--cobalt)';
    return 'var(--muted)';
  };

  const DuelCard = ({ d }: { d: DuelSummary }) => {
    const isChallenger = d.challenger_id === userId;
    const opponentEmail = getEmail(isChallenger ? d.opponent_id : d.challenger_id);
    const isPendingForMe = d.status === 'pending' && d.opponent_id === userId;

    return (
      <div className="card" style={{ padding: '16px 20px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: 3 }}>
              {isChallenger ? 'YOU → ' : ''}{opponentEmail}{!isChallenger ? ' → YOU' : ''}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              📚 {d.courses?.name || 'Unknown course'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, color: statusColor(d.status), background: d.status === 'completed' ? 'var(--green-soft)' : 'var(--paper-2)', border: `1px solid ${statusColor(d.status)}` }}>
                {d.status.toUpperCase()}
              </span>
              {d.status === 'completed' && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, color: d.winner_id === userId ? 'var(--green)' : d.winner_id ? 'var(--magenta)' : 'var(--muted)', background: d.winner_id === userId ? 'var(--green-soft)' : '#fff' }}>
                  {d.winner_id === userId ? '🏆 WIN' : d.winner_id ? '💔 LOSS' : '🤝 DRAW'}
                </span>
              )}
              {d.status === 'completed' && (
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
                  {d.challenger_correct ?? '?'} – {d.opponent_correct ?? '?'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isPendingForMe && (
              <>
                <button onClick={() => handleAccept(d.id)} disabled={actionLoading === d.id}
                  style={{ padding: '7px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}>
                  Accept
                </button>
                <button onClick={() => handleDecline(d.id)} disabled={actionLoading === d.id}
                  style={{ padding: '7px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Decline
                </button>
              </>
            )}
            {['accepted', 'in_progress'].includes(d.status) && (
              <button onClick={() => router.push(`/duels/${d.id}`)}
                style={{ padding: '7px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}>
                ⚔️ Play
              </button>
            )}
            {d.status === 'completed' && (
              <button onClick={() => router.push(`/duels/${d.id}`)}
                style={{ padding: '7px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                View
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', margin: 0 }}>
            ⚔️ <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Duels</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Challenge classmates to timed quiz battles
          </p>
        </div>
        <button onClick={() => { setShowChallenge(true); setStep('opponent'); }} className="btn btn-primary" style={{ fontSize: 13, padding: '10px 20px' }}>
          ⚔️ Challenge
        </button>
      </div>

      {/* Win/Loss Record */}
      {completed.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ flex: 1, padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--green)' }}>{wins}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>WINS</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--magenta)' }}>{losses}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>LOSSES</div>
          </div>
          <div className="card" style={{ flex: 1, padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--muted)' }}>{draws}</div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>DRAWS</div>
          </div>
        </div>
      )}

      {/* Pending Challenges For Me */}
      {pendingForMe.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--magenta)', fontWeight: 700, marginBottom: 10 }}>
            ⚡ INCOMING CHALLENGES ({pendingForMe.length})
          </div>
          {pendingForMe.map(d => <DuelCard key={d.id} d={d} />)}
          <div style={{ height: 20 }} />
        </>
      )}

      {/* Active Duels */}
      {active.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cobalt)', fontWeight: 700, marginBottom: 10 }}>
            🎮 ACTIVE ({active.length})
          </div>
          {active.map(d => <DuelCard key={d.id} d={d} />)}
          <div style={{ height: 20 }} />
        </>
      )}

      {/* Sent (waiting for opponent) */}
      {pendingSent.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>
            ⏳ SENT ({pendingSent.length})
          </div>
          {pendingSent.map(d => <DuelCard key={d.id} d={d} />)}
          <div style={{ height: 20 }} />
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>
            📋 HISTORY ({completed.length})
          </div>
          {completed.map(d => <DuelCard key={d.id} d={d} />)}
        </>
      )}

      {duels.length === 0 && (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>
          No duels yet. Challenge a classmate to get started!
        </div>
      )}

      {/* Challenge Modal */}
      {showChallenge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setShowChallenge(false); setStep('opponent'); setSelectedOpponent(null); }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px' }} onClick={e => e.stopPropagation()}>
            {step === 'opponent' ? (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  STEP 1: <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Pick Opponent</span>
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>Search by username or email</p>
                <input value={searchQ} onChange={e => handleSearch(e.target.value)} placeholder="Type a username or email..."
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--ink)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
                />
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  {searchResults.map(u => (
                    <button key={u.id} onClick={() => selectOpponent(u)} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 0',
                      borderBottom: '1px solid var(--line)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username || u.email}</div>
                        {u.username && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{u.email}</div>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--cobalt)', fontWeight: 700 }}>Select →</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  STEP 2: <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--magenta)' }}>Pick Course</span>
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4 }}>
                  Challenging <strong>{selectedOpponent?.username || selectedOpponent?.email}</strong>
                </p>
                <p style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 16 }}>
                  Pick one of your courses. 20 random questions will be used.
                </p>
                {createError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '2px solid var(--magenta)', marginBottom: 14, fontSize: 13, color: 'var(--magenta)', fontWeight: 600 }}>
                    ⚠️ {createError}
                  </div>
                )}
                {myCourses.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No ready courses to duel with. Upload and analyze a course first.</p>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {myCourses.map(c => (
                      <button key={c.id} onClick={() => handleCreateDuel(c.id)} disabled={creating}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 0',
                          borderBottom: '1px solid var(--line)', background: 'none', border: 'none', cursor: creating ? 'wait' : 'pointer', textAlign: 'left',
                        }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--magenta)', fontWeight: 700 }}>⚔️ Challenge</span>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setStep('opponent'); setSelectedOpponent(null); }} style={{ marginTop: 12, fontSize: 12, color: 'var(--cobalt)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                  ← Back to opponent selection
                </button>
              </>
            )}
            <button onClick={() => { setShowChallenge(false); setStep('opponent'); setSelectedOpponent(null); }}
              style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
