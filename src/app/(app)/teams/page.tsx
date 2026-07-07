'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  visibility: 'open' | 'invite_only';
  created_at: string;
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
}

interface Invite {
  id: string;
  team_id: string;
  teams: { name: string; description: string | null; owner_id: string };
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createVis, setCreateVis] = useState<'open' | 'invite_only'>('open');
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data.teams || []);
      setInvites(data.invites || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      fetchTeams();
    };
    init();
  }, [fetchTeams]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, description: createDesc, visibility: createVis }),
      });
      const data = await res.json();
      if (data.team) {
        setShowCreate(false);
        setCreateName('');
        setCreateDesc('');
        fetchTeams();
      }
    } catch { /* ignore */ }
    setCreating(false);
  };

  const handleJoin = async (teamId: string) => {
    setActionLoading(teamId);
    await fetch(`/api/teams/${teamId}/join`, { method: 'POST' });
    fetchTeams();
    setActionLoading(null);
  };

  const handleInviteResponse = async (teamId: string, action: 'accept' | 'decline') => {
    setActionLoading(teamId);
    await fetch(`/api/teams/${teamId}/invite/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    fetchTeams();
    setActionLoading(null);
  };

  const myTeams = teams.filter(t => t.is_member);
  const browseTeams = teams.filter(t => !t.is_member && t.visibility === 'open');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--line)', borderTop: '4px solid var(--cobalt)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', margin: 0 }}>
            STUDY <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Teams</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            Team up with classmates, share courses, and compete on leaderboards.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ fontSize: 13, padding: '10px 20px' }}>
          + Create Team
        </button>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--magenta)', fontWeight: 700, marginBottom: 10 }}>
            📩 PENDING INVITES ({invites.length})
          </div>
          {invites.map(inv => (
            <div key={inv.id} className="card" style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{inv.teams.name}</div>
                {inv.teams.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{inv.teams.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleInviteResponse(inv.team_id, 'accept')} disabled={actionLoading === inv.team_id}
                  style={{ padding: '6px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}>
                  Accept
                </button>
                <button onClick={() => handleInviteResponse(inv.team_id, 'decline')} disabled={actionLoading === inv.team_id}
                  style={{ padding: '6px 16px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Teams */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>
        MY TEAMS ({myTeams.length})
      </div>
      {myTeams.length === 0 ? (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', marginBottom: 32 }}>
          You haven&apos;t joined any teams yet. Create one or browse teams below.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {myTeams.map(t => (
            <button key={t.id} onClick={() => router.push(`/teams/${t.id}`)} className="card" style={{
              padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', textAlign: 'left', width: '100%', border: '2px solid var(--ink)', background: '#fff',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {t.name}
                  {t.is_owner && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--cobalt)', color: '#fff', borderRadius: 6, padding: '2px 7px', fontFamily: 'var(--font-mono)' }}>OWNER</span>}
                </div>
                {t.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{t.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                  {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 12, background: t.visibility === 'open' ? 'var(--green-soft)' : 'var(--cobalt-soft)', color: t.visibility === 'open' ? 'var(--green)' : 'var(--cobalt)', border: `1px solid ${t.visibility === 'open' ? 'var(--green)' : 'var(--cobalt)'}`, borderRadius: 6, padding: '2px 7px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {t.visibility === 'open' ? 'Open' : 'Invite'}
                </span>
                <span style={{ color: 'var(--muted)' }}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Browse Teams */}
      {browseTeams.length > 0 && (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>
            BROWSE OPEN TEAMS ({browseTeams.length})
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {browseTeams.map(t => (
              <div key={t.id} className="card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                  {t.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{t.description}</div>}
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {t.member_count} member{t.member_count !== 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => handleJoin(t.id)} disabled={actionLoading === t.id}
                  style={{ padding: '8px 20px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}>
                  {actionLoading === t.id ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Team Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowCreate(false)}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: '0 0 20px' }}>
              CREATE <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Team</span>
            </h2>
            <label style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>TEAM NAME</label>
            <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. KNUST Chem Squad"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--ink)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 16, outline: 'none' }}
            />
            <label style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>DESCRIPTION (optional)</label>
            <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="What's this team about?"
              rows={3} style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--ink)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 16, outline: 'none', resize: 'vertical' }}
            />
            <label style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>VISIBILITY</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {(['open', 'invite_only'] as const).map(v => (
                <button key={v} onClick={() => setCreateVis(v)} style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10, border: `2px solid ${createVis === v ? 'var(--cobalt)' : 'var(--line)'}`,
                  background: createVis === v ? 'var(--cobalt-soft)' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  color: createVis === v ? 'var(--cobalt)' : 'var(--muted)',
                }}>
                  {v === 'open' ? '🌍 Open' : '🔒 Invite Only'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || !createName.trim()} className="btn btn-primary" style={{ flex: 1, padding: '12px', fontSize: 14, opacity: creating || !createName.trim() ? 0.5 : 1 }}>
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
