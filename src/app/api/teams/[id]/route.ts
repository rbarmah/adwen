import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/teams/[id] — team details with members, courses, leaderboards
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Team info
  const { data: team } = await (supabase
    .from('teams').select('*').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Members with emails (from profiles or auth)
  const { data: members } = await (supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true }) as any);

  // Team courses with course details
  const { data: teamCourses } = await (supabase
    .from('team_courses')
    .select('*, courses(id, name, status, created_at)')
    .eq('team_id', teamId) as any);

  // Get member user IDs
  const memberIds = (members || []).map((m: any) => m.user_id);

  // Get course IDs for this team
  const courseIds = (teamCourses || []).map((tc: any) => tc.course_id);

  // ── Engagement Leaderboard ─────────────────────────────────────────────────
  // Count quiz sessions, response_events, chat_messages per member on team courses
  const engagementMap: Record<string, { quizzes: number; answers: number; chats: number }> = {};
  for (const uid of memberIds) {
    engagementMap[uid] = { quizzes: 0, answers: 0, chats: 0 };
  }

  if (courseIds.length > 0 && memberIds.length > 0) {
    // Quiz sessions on team courses
    const { data: sessions } = await (supabase
      .from('quiz_sessions')
      .select('user_id')
      .in('user_id', memberIds)
      .in('course_id', courseIds) as any);
    for (const s of (sessions || [])) {
      if (engagementMap[s.user_id]) engagementMap[s.user_id].quizzes++;
    }

    // Response events on team courses (via quiz_sessions)
    const { data: responses } = await (supabase
      .from('response_events')
      .select('user_id, is_correct')
      .in('user_id', memberIds) as any);
    for (const r of (responses || [])) {
      if (engagementMap[r.user_id]) engagementMap[r.user_id].answers++;
    }

    // Chat messages on team courses
    const { data: chats } = await (supabase
      .from('chat_messages')
      .select('user_id')
      .in('user_id', memberIds)
      .in('course_id', courseIds)
      .eq('role', 'user') as any);
    for (const c of (chats || [])) {
      if (engagementMap[c.user_id]) engagementMap[c.user_id].chats++;
    }
  }

  const engagementLeaderboard = memberIds.map((uid: string) => {
    const e = engagementMap[uid] || { quizzes: 0, answers: 0, chats: 0 };
    return {
      user_id: uid,
      role: (members || []).find((m: any) => m.user_id === uid)?.role || 'member',
      quizzes: e.quizzes,
      answers: e.answers,
      chats: e.chats,
      total: e.quizzes + e.answers + e.chats,
    };
  }).sort((a: any, b: any) => b.total - a.total);

  // ── Accuracy Leaderboard ───────────────────────────────────────────────────
  const accuracyMap: Record<string, { correct: number; total: number }> = {};
  for (const uid of memberIds) {
    accuracyMap[uid] = { correct: 0, total: 0 };
  }

  if (courseIds.length > 0 && memberIds.length > 0) {
    const { data: allResponses } = await (supabase
      .from('response_events')
      .select('user_id, is_correct')
      .in('user_id', memberIds) as any);
    for (const r of (allResponses || [])) {
      if (accuracyMap[r.user_id]) {
        accuracyMap[r.user_id].total++;
        if (r.is_correct) accuracyMap[r.user_id].correct++;
      }
    }
  }

  const accuracyLeaderboard = memberIds.map((uid: string) => {
    const a = accuracyMap[uid] || { correct: 0, total: 0 };
    return {
      user_id: uid,
      role: (members || []).find((m: any) => m.user_id === uid)?.role || 'member',
      correct: a.correct,
      total: a.total,
      accuracy: a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
    };
  }).sort((a: any, b: any) => b.accuracy - a.accuracy);

  return NextResponse.json({
    team,
    members: members || [],
    courses: (teamCourses || []).map((tc: any) => ({ ...tc.courses, team_course_id: tc.id })),
    engagementLeaderboard,
    accuracyLeaderboard,
    is_owner: team.owner_id === user.id,
    is_member: memberIds.includes(user.id),
  });
}

// PATCH /api/teams/[id] — update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can update' }, { status: 403 });

  const body = await request.json();
  const updates: any = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.visibility !== undefined) updates.visibility = body.visibility;

  const { error } = await (supabase.from('teams') as any).update(updates).eq('id', teamId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/teams/[id] — delete team
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: team } = await (supabase.from('teams').select('owner_id').eq('id', teamId).single() as any);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.owner_id !== user.id) return NextResponse.json({ error: 'Only the team owner can delete' }, { status: 403 });

  await (supabase.from('teams').delete().eq('id', teamId) as any);
  return NextResponse.json({ success: true });
}
