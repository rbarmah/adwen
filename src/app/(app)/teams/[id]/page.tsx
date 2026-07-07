'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TeamData {
  team: { id: string; name: string; description: string | null; owner_id: string; visibility: string; created_at: string };
  members: { user_id: string; role: string; joined_at: string }[];
  courses: { id: string; name: string; status: string; team_course_id: string }[];
  engagementLeaderboard: { user_id: string; role: string; quizzes: number; answers: number; chats: number; total: number }[];
  accuracyLeaderboard: { user_id: string; role: string; correct: number; total: number; accuracy: number }[];
  is_owner: boolean;
  is_member: boolean;
}

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'courses' | 'engagement' | 'accuracy'>('courses');
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  // Add course modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [myCourses, setMyCourses] = useState<{ id: string; name: string }[]>([]);
  const [addingCourse, setAddingCourse] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      const d = await res.json();
      setData(d);

      // Build email map from user search
      const memberIds = (d.members || []).map((m: any) => m.user_id);
      if (memberIds.length > 0) {
        // Fetch emails for members (search each)
        const res2 = await fetch(`/api/users/search?q=@`);
        const d2 = await res2.json();
        const map: Record<string, string> = {};
        for (const u of (d2.users || [])) {
          map[u.id] = u.email;
        }
        setEmailMap(map);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    // Filter out existing members
    const memberIds = new Set(data?.members?.map(m => m.user_id) || []);
    setSearchResults((d.users || []).filter((u: any) => !memberIds.has(u.id)));
    setSearching(false);
  };

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    await fetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setInviting(null);
    setSearchResults(r => r.filter(u => u.id !== userId));
  };

  const handleAddCourse = async (courseId: string) => {
    setAddingCourse(courseId);
    await fetch(`/api/teams/${teamId}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    setAddingCourse(null);
    setShowAddCourse(false);
    fetchTeam();
  };

  const handleRemoveCourse = async (courseId: string) => {
    await fetch(`/api/teams/${teamId}/courses`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    fetchTeam();
  };

  const handleLeave = async () => {
    if (!confirm('Leave this team?')) return;
    await fetch(`/api/teams/${teamId}/leave`, { method: 'POST' });
    router.push('/teams');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this team? This cannot be undone.')) return;
    await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
    router.push('/teams');
  };

  const openAddCourse = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: courses } = await (supabase.from('courses').select('id, name').eq('user_id', user.id).eq('status', 'ready') as any);
    const existingIds = new Set(data?.courses?.map(c => c.id) || []);
    setMyCourses((courses || []).filter((c: any) => !existingIds.has(c.id)));
    setShowAddCourse(true);
  };

  const getEmail = (uid: string) => emailMap[uid] || uid.slice(0, 8) + '...';
  const getInitials = (uid: string) => {
    const email = emailMap[uid];
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--line)', borderTop: '4px solid var(--cobalt)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const { team, members, courses, engagementLeaderboard, accuracyLeaderboard, is_owner, is_member } = data;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 16px' }}>

      {/* Back */}
      <button onClick={() => router.push('/teams')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cobalt)', fontWeight: 700, fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← All Teams
      </button>

      {/* Team Header */}
      <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', textTransform: 'uppercase', margin: 0 }}>
              {team.name}
            </h1>
            {team.description && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{team.description}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, background: team.visibility === 'open' ? 'var(--green-soft)' : 'var(--cobalt-soft)', color: team.visibility === 'open' ? 'var(--green)' : 'var(--cobalt)', border: `1px solid ${team.visibility === 'open' ? 'var(--green)' : 'var(--cobalt)'}`, borderRadius: 6, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {team.visibility === 'open' ? '🌍 Open' : '🔒 Invite Only'}
              </span>
              <span style={{ fontSize: 11, background: 'var(--paper-2)', borderRadius: 6, padding: '2px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {is_owner && (
              <>
                <button onClick={() => setShowInvite(true)} style={{ padding: '7px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--cobalt)', background: 'var(--cobalt-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--cobalt)' }}>
                  + Invite
                </button>
                <button onClick={openAddCourse} style={{ padding: '7px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--green)', background: 'var(--green-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--green)' }}>
                  + Course
                </button>
                <button onClick={handleDelete} style={{ padding: '7px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--magenta)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--magenta)' }}>
                  Delete
                </button>
              </>
            )}
            {is_member && !is_owner && (
              <button onClick={handleLeave} style={{ padding: '7px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Leave Team
              </button>
            )}
          </div>
        </div>

        {/* Members avatars */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {members.map(m => (
            <div key={m.user_id} title={getEmail(m.user_id)} style={{
              width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: m.role === 'owner' ? 'var(--cobalt)' : 'var(--paper-2)',
              color: m.role === 'owner' ? '#fff' : 'var(--ink)',
              border: '2px solid var(--ink)', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
            }}>
              {getInitials(m.user_id)}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['courses', 'engagement', 'accuracy'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 'var(--pill)', border: `2px solid ${tab === t ? 'var(--ink)' : 'var(--line)'}`,
            background: tab === t ? 'var(--lime)' : '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            boxShadow: tab === t ? '0 2px 0 var(--ink)' : 'none', textTransform: 'capitalize',
          }}>
            {t === 'courses' ? `📚 Courses (${courses.length})` : t === 'engagement' ? '🔥 Engagement' : '🎯 Accuracy'}
          </button>
        ))}
      </div>

      {/* Courses Tab */}
      {tab === 'courses' && (
        <div>
          {courses.length === 0 ? (
            <div className="card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              {is_owner ? 'No courses yet. Click "+ Course" above to assign one.' : 'No courses assigned to this team yet.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {courses.map(c => (
                <div key={c.id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: c.status === 'ready' ? 'var(--green)' : 'var(--tangerine)', fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 3 }}>
                      {c.status === 'ready' ? '● Ready' : '● ' + c.status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {c.status === 'ready' && (
                      <button onClick={() => router.push(`/courses/${c.id}`)} style={{ padding: '6px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: 'var(--lime)', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 0 var(--ink)' }}>
                        Study →
                      </button>
                    )}
                    {is_owner && (
                      <button onClick={() => handleRemoveCourse(c.id)} style={{ padding: '6px 14px', borderRadius: 'var(--pill)', border: '2px solid var(--magenta)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--magenta)' }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engagement Leaderboard */}
      {tab === 'engagement' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--ink)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', margin: 0 }}>
              🔥 ENGAGEMENT <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--tangerine)' }}>Leaderboard</span>
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>Who&apos;s been studying the most on team courses</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'center', width: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>#</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>STUDENT</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>QUIZZES</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>ANSWERS</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>CHATS</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {engagementLeaderboard.map((row, i) => (
                <tr key={row.user_id} style={{ borderBottom: '1px solid var(--line)', background: i === 0 ? 'rgba(250,204,21,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--paper-2)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: i === 0 ? 'var(--tangerine)' : 'var(--muted)' }}>
                    {i === 0 ? '🏆' : i + 1}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {getEmail(row.user_id)}
                    {row.role === 'owner' && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--cobalt)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>OWNER</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.quizzes}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.answers}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.chats}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--cobalt)' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accuracy Leaderboard */}
      {tab === 'accuracy' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--ink)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', textTransform: 'uppercase', margin: 0 }}>
              🎯 ACCURACY <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--green)' }}>Leaderboard</span>
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>Who&apos;s getting the most questions right</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'center', width: 40, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>#</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>STUDENT</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>CORRECT</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>TOTAL</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>ACCURACY</th>
              </tr>
            </thead>
            <tbody>
              {accuracyLeaderboard.map((row, i) => (
                <tr key={row.user_id} style={{ borderBottom: '1px solid var(--line)', background: i === 0 ? 'rgba(34,197,94,0.08)' : i % 2 === 0 ? 'transparent' : 'var(--paper-2)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800, color: i === 0 ? 'var(--green)' : 'var(--muted)' }}>
                    {i === 0 ? '🏆' : i + 1}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    {getEmail(row.user_id)}
                    {row.role === 'owner' && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--cobalt)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>OWNER</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.correct}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.total}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)',
                      background: row.accuracy >= 70 ? 'var(--green-soft)' : row.accuracy >= 40 ? 'var(--cobalt-soft)' : 'var(--paper-2)',
                      color: row.accuracy >= 70 ? 'var(--green)' : row.accuracy >= 40 ? 'var(--cobalt)' : 'var(--muted)',
                      border: `1.5px solid ${row.accuracy >= 70 ? 'var(--green)' : row.accuracy >= 40 ? 'var(--cobalt)' : 'var(--line)'}`,
                    }}>
                      {row.accuracy}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowInvite(false)}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: '0 0 16px' }}>
              INVITE <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--cobalt)' }}>Member</span>
            </h2>
            <input value={searchQ} onChange={e => handleSearch(e.target.value)} placeholder="Search by email..."
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--ink)', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
            />
            {searching && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Searching...</p>}
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {searchResults.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.email}</span>
                  <button onClick={() => handleInvite(u.id)} disabled={inviting === u.id}
                    style={{ padding: '5px 12px', borderRadius: 'var(--pill)', border: '2px solid var(--cobalt)', background: 'var(--cobalt-soft)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--cobalt)' }}>
                    {inviting === u.id ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowInvite(false)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAddCourse(false)}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: '28px 24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', textTransform: 'uppercase', margin: '0 0 16px' }}>
              ADD <span style={{ fontFamily: 'var(--font-accent)', textTransform: 'none', color: 'var(--green)' }}>Course</span>
            </h2>
            {myCourses.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No available courses to add. All your courses are already in this team, or you haven&apos;t uploaded any ready courses.</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {myCourses.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <button onClick={() => handleAddCourse(c.id)} disabled={addingCourse === c.id}
                      style={{ padding: '5px 12px', borderRadius: 'var(--pill)', border: '2px solid var(--green)', background: 'var(--green-soft)', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: 'var(--green)' }}>
                      {addingCourse === c.id ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddCourse(false)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 'var(--pill)', border: '2px solid var(--ink)', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
